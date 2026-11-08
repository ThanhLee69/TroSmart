package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.ContactRequest;
import com.project.trosmart.dto.request.PublicRoomSearchRequest;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.PublicRoomDetailResponse;
import com.project.trosmart.dto.response.PublicRoomResponse;
import com.project.trosmart.entity.*;
import com.project.trosmart.enums.ContactStatus;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.repository.AmenityRepository;
import com.project.trosmart.repository.ContactRepository;
import com.project.trosmart.repository.RoomImageRepository;
import com.project.trosmart.repository.RoomRepository;
import com.project.trosmart.repository.specification.RoomSpecifications;
import com.project.trosmart.service.PublicService;
import com.project.trosmart.util.CaptchaVerifier;
import com.project.trosmart.util.GeoUtils;
import com.project.trosmart.util.RateLimiter;
import com.project.trosmart.util.RoomSimilarity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.function.ToDoubleFunction;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Nghiệp vụ cho website công khai: danh sách và tìm phòng trống, chi tiết phòng,
 * phòng tương tự, tiện nghi và gửi liên hệ.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicServiceImpl implements PublicService {

    // =====================================================
    // PHỤ THUỘC VÀ CẤU HÌNH
    // =====================================================

    private final RoomRepository roomRepository;
    private final RoomImageRepository roomImageRepository;
    private final AmenityRepository amenityRepository;
    private final ContactRepository contactRepository;
    private final RateLimiter rateLimiter;
    private final CaptchaVerifier captchaVerifier;

    // --- Tìm phòng theo vị trí ---

    // Bán kính mặc định (km) khi người dùng chỉ gửi vị trí mà không chọn bán kính
    private static final double DEFAULT_RADIUS_KM = 2.0;

    // --- Phòng tương tự ---

    // Nới dần khoảng giá quanh giá phòng đang xem nếu chưa đủ phòng: ±30%, ±60%,
    // rồi 10.0 (±1000%) coi như không giới hạn
    private static final double[] PRICE_RANGE_STEPS = {0.3, 0.6, 10.0};
    // Số ứng viên tối đa đem đi chấm điểm
    private static final int SIMILAR_CANDIDATE_LIMIT = 50;

    private record ScoredRoom(Room room, double score) {
    }

    // --- Chống spam khi gửi liên hệ ---

    // Số lần gửi tối đa của 1 IP trong 1 giờ (tính cả lần bị từ chối)
    @Value("${app.contact.ip-limit-per-hour:5}")
    private int ipLimitPerHour;
    // Tổng số liên hệ tối đa trong 24 giờ, để hộp thư chủ trọ không bị ngập
    @Value("${app.contact.daily-cap:300}")
    private int dailyCap;
    // Điền form nhanh hơn mức này (ms) là máy, không phải người
    private static final long MIN_FILL_MILLIS = 2_000;
    // Spam thường nhét nhiều đường link
    private static final int MAX_LINKS = 1;
    private static final Pattern LINK_PATTERN = Pattern.compile("(?i)(https?://|www\\.)");

    // =====================================================
    // 1. DANH SÁCH PHÒNG TRỐNG (trang chủ)
    // =====================================================

    @Override
    public PageResponse<PublicRoomResponse> getAvailableRooms(int page, int size) {
        Page<Room> roomPage = roomRepository.findAvailableRooms(PageRequest.of(page - 1, size));
        List<Room> rooms = roomPage.getContent();

        // Lấy ảnh đại diện của cả trang bằng 1 query, tránh N+1
        Map<Long, String> thumbnails = getThumbnails(rooms);

        List<PublicRoomResponse> items = rooms.stream()
                .map(room -> toResponse(room, thumbnails.get(room.getId()), null))
                .toList();

        return toPageResponse(items, roomPage);
    }

    // =====================================================
    // 2. TÌM PHÒNG THEO BỘ LỌC (trang Tìm phòng)
    // =====================================================

    @Override
    public PageResponse<PublicRoomResponse> searchAvailableRooms(PublicRoomSearchRequest req) {
        Specification<Room> spec = RoomSpecifications.publicSearch(req);

        // Có vị trí người dùng thì phải tính khoảng cách, đi nhánh riêng
        if (req.hasOrigin()) {
            return searchNearby(req, spec);
        }

        // Không có vị trí: lọc, sắp xếp và phân trang hoàn toàn bằng SQL
        Pageable pageable = PageRequest.of(req.getPage() - 1, req.getPageSize(), dbSort(req.getSort()));
        Page<Room> roomPage = roomRepository.findAll(spec, pageable);
        List<Room> rooms = roomPage.getContent();

        Map<Long, String> thumbnails = getThumbnails(rooms);

        List<PublicRoomResponse> items = rooms.stream()
                .map(room -> toResponse(room, thumbnails.get(room.getId()), null))
                .toList();

        return toPageResponse(items, roomPage);
    }

    /**
     * Tìm theo vị trí: DB đã lọc thô bằng hình chữ nhật, ở đây tính Haversine
     * chính xác, bỏ phòng ngoài bán kính, sắp xếp rồi phân trang trong bộ nhớ.
     * Số phòng của một hệ thống nhà trọ nhỏ nên cách này đủ nhanh.
     */
    private PageResponse<PublicRoomResponse> searchNearby(PublicRoomSearchRequest req, Specification<Room> spec) {
        double radius = req.getRadiusKm() != null ? req.getRadiusKm() : DEFAULT_RADIUS_KM;

        record RoomDistance(Room room, double km) {
        }

        // Giữ lại phòng nằm trong bán kính, kèm khoảng cách đến vị trí người dùng
        List<RoomDistance> matched = new ArrayList<>();
        for (Room room : roomRepository.findAll(spec)) {
            Building b = room.getBuilding();
            // Tòa nhà chưa có tọa độ thì không tính được khoảng cách
            if (b.getLatitude() == null || b.getLongitude() == null) continue;

            double km = GeoUtils.haversineKm(
                    req.getLat(), req.getLng(),
                    b.getLatitude().doubleValue(), b.getLongitude().doubleValue());

            if (km <= radius) {
                matched.add(new RoomDistance(room, km));
            }
        }

        matched.sort(nearbyComparator(req.getSort(), RoomDistance::room, RoomDistance::km));

        // Phân trang thủ công trên danh sách đã sắp xếp
        int total = matched.size();
        int size = req.getPageSize();
        int from = Math.min((req.getPage() - 1) * size, total);
        int to = Math.min(from + size, total);
        List<RoomDistance> slice = matched.subList(from, to);

        Map<Long, String> thumbnails = getThumbnails(slice.stream().map(RoomDistance::room).toList());

        List<PublicRoomResponse> items = slice.stream()
                .map(rd -> toResponse(rd.room(), thumbnails.get(rd.room().getId()), rd.km()))
                .toList();

        return PageResponse.<PublicRoomResponse>builder()
                .items(items)
                .currentPage(req.getPage())
                .pageSize(size)
                .totalItems(total)
                .totalPages((int) Math.ceil(total / (double) size))
                .build();
    }

    // Thứ tự sắp xếp khi tìm theo vị trí; bằng nhau thì gần hơn đứng trước
    private <T> Comparator<T> nearbyComparator(
            String sort,
            Function<T, Room> roomOf,
            ToDoubleFunction<T> kmOf
    ) {
        Comparator<T> byDistance = Comparator.comparingDouble(kmOf);

        if ("price_asc".equals(sort)) {
            return Comparator.comparing((T t) -> roomOf.apply(t).getRentalPrice()).thenComparing(byDistance);
        }
        if ("price_desc".equals(sort)) {
            return Comparator.comparing((T t) -> roomOf.apply(t).getRentalPrice()).reversed().thenComparing(byDistance);
        }
        if ("area_desc".equals(sort)) {
            // Phòng chưa có diện tích xếp cuối
            return Comparator.comparing(
                    (T t) -> roomOf.apply(t).getArea() == null ? BigDecimal.ZERO : roomOf.apply(t).getArea()
            ).reversed().thenComparing(byDistance);
        }
        return byDistance; // "distance" hoặc không chọn
    }

    // Thứ tự sắp xếp khi không tìm theo vị trí; bằng nhau thì phòng mới hơn đứng trước
    private Sort dbSort(String sort) {
        Sort byNewest = Sort.by(Sort.Direction.DESC, "id");

        if ("price_asc".equals(sort)) {
            return Sort.by(Sort.Direction.ASC, "rentalPrice").and(byNewest);
        }
        if ("price_desc".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "rentalPrice").and(byNewest);
        }
        if ("area_desc".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "area").and(byNewest);
        }
        return byNewest; // "distance" mà không có vị trí thì về mới nhất
    }

    // =====================================================
    // 3. CHI TIẾT PHÒNG
    // =====================================================

    @Override
    public PublicRoomDetailResponse getAvailableRoomDetail(Long id) {
        Room room = roomRepository.findAvailableRoomById(id)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        Building building = room.getBuilding();

        // Ảnh đã xếp sẵn, ảnh đại diện đứng đầu
        List<String> imageUrls = roomImageRepository.findByRoomIdOrdered(id).stream()
                .map(RoomImage::getImageUrl)
                .toList();

        List<String> amenities = room.getAmenities().stream()
                .map(Amenity::getName)
                .sorted()
                .toList();

        // Tiện nghi chung của tòa nhà. Building.amenities là LAZY, truy cập được
        // vì đang nằm trong transaction readOnly của class
        List<String> buildingAmenities = building.getAmenities() == null
                ? List.of()
                : building.getAmenities().stream()
                .map(Amenity::getName)
                .sorted()
                .toList();

        return PublicRoomDetailResponse.builder()
                .id(room.getId())
                .roomNumber(room.getRoomNumber())
                .roomType(room.getRoomType())
                .maxOccupancy(room.getMaxOccupancy())
                .floor(room.getFloor())
                .area(room.getArea())
                .rentalPrice(room.getRentalPrice())
                .description(room.getDescription())
                .thumbnailUrl(imageUrls.isEmpty() ? null : imageUrls.get(0))
                .imageUrls(imageUrls)
                .amenities(amenities)
                .buildingAmenities(buildingAmenities)
                .buildingId(building.getId())
                .buildingName(building.getName())
                .address(building.getAddress())
                .province(building.getProvince())
                .ward(building.getWard())
                .latitude(building.getLatitude())
                .longitude(building.getLongitude())
                .build();
    }

    // =====================================================
    // 4. PHÒNG TƯƠNG TỰ
    // =====================================================

    /**
     * Hai bước: SQL lọc ứng viên theo khoảng giá, rồi chấm điểm giống nhau
     * (giá, vị trí, diện tích, tiện nghi, loại phòng) bằng RoomSimilarity.
     */
    @Override
    public List<PublicRoomResponse> getSimilarRooms(Long roomId, int limit) {
        Room base = roomRepository.findAvailableRoomById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        BigDecimal price = base.getRentalPrice();

        // Bước 1: lọc ứng viên bằng SQL, nới khoảng giá cho tới khi đủ số phòng cần lấy
        List<Room> candidates = List.of();

        for (double ratio : PRICE_RANGE_STEPS) {
            BigDecimal min = price.multiply(BigDecimal.valueOf(1 - ratio)).max(BigDecimal.ZERO);
            BigDecimal max = price.multiply(BigDecimal.valueOf(1 + ratio));

            candidates = roomRepository.findSimilarCandidates(
                    roomId, min, max, PageRequest.of(0, SIMILAR_CANDIDATE_LIMIT)
            );

            if (candidates.size() >= limit) {
                break;
            }
        }

        if (candidates.isEmpty()) {
            return List.of();
        }

        // Nạp tiện nghi của cả nhóm bằng 1 query. Kết quả không dùng trực tiếp: các Room
        // trả về là chính những đối tượng trong candidates (cùng persistence context)
        // nên tập tiện nghi được điền sẵn cho bước chấm điểm, tránh N+1.
        roomRepository.findAllWithAmenitiesByIdIn(
                candidates.stream().map(Room::getId).toList()
        );

        // Bước 2: chấm điểm, điểm cao trước, bằng điểm thì phòng mới hơn trước
        List<Room> top = candidates.stream()
                .map(room -> new ScoredRoom(room, RoomSimilarity.score(base, room)))
                .sorted(Comparator.comparingDouble(ScoredRoom::score).reversed()
                        .thenComparing(scored -> scored.room().getId(), Comparator.reverseOrder()))
                .limit(limit)
                .map(ScoredRoom::room)
                .toList();

        Map<Long, String> thumbnails = getThumbnails(top);

        return top.stream()
                .map(room -> toResponse(room, thumbnails.get(room.getId()), null))
                .toList();
    }

    // =====================================================
    // 5. TIỆN NGHI (bộ lọc trang Tìm phòng)
    // =====================================================

    @Override
    public List<String> getAmenityNames() {
        return amenityRepository.findAll(Sort.by("name")).stream()
                .map(Amenity::getName)
                .toList();
    }

    // =====================================================
    // 6. GỬI LIÊN HỆ
    // =====================================================

    /**
     * Cố ý không dùng transaction: bước gọi captcha qua mạng không nên giữ kết nối DB.
     * save() của repository đã tự có transaction riêng.
     * Các bước kiểm tra chạy từ rẻ đến đắt để chặn spam sớm.
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void createContact(ContactRequest request, String clientIp) {

        // 1. Giới hạn theo IP
        if (!rateLimiter.tryAcquire("contact:ip:" + clientIp, ipLimitPerHour, Duration.ofHours(1))) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS);
        }

        // 2. Honeypot: ô ẩn bị điền thì chắc chắn là bot.
        //    Trả về như thành công để bot không biết mà đổi cách.
        if (request.getWebsite() != null && !request.getWebsite().isBlank()) {
            log.warn("Liên hệ bị bỏ qua (honeypot), IP {}", clientIp);
            return;
        }

        // 3. Điền form quá nhanh
        if (request.getElapsedMs() < MIN_FILL_MILLIS) {
            throw new AppException(ErrorCode.CONTACT_TOO_FAST);
        }

        // 4. Captcha (nếu bật)
        captchaVerifier.verify(request.getCaptchaToken(), clientIp);

        // 5. Chuẩn hóa dữ liệu và chặn nội dung nhiều link
        String fullName = sanitize(request.getFullName()).replaceAll("\\s+", " ");
        String phone = normalizePhone(request.getPhone());
        String message = sanitize(request.getMessage());
        String email = blankToNull(request.getEmail());

        if (countLinks(message) > MAX_LINKS) {
            throw new AppException(ErrorCode.CONTACT_INVALID_CONTENT);
        }

        LocalDateTime now = LocalDateTime.now();

        // 6. Giới hạn theo số điện thoại: không gửi dồn trong 2 phút, không trùng nội dung trong 24 giờ
        if (contactRepository.existsByPhoneAndCreatedAtAfter(phone, now.minusMinutes(2))) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS);
        }

        if (contactRepository.existsByPhoneAndMessageAndCreatedAtAfter(phone, message, now.minusHours(24))) {
            throw new AppException(ErrorCode.CONTACT_DUPLICATED);
        }

        // 7. Trần tổng theo ngày
        if (contactRepository.countByCreatedAtAfter(now.minusHours(24)) >= dailyCap) {
            log.warn("Đã chạm trần {} liên hệ/24h", dailyCap);
            throw new AppException(ErrorCode.CONTACT_UNAVAILABLE);
        }

        // 8. Phòng liên quan (nếu có). Không tìm thấy thì coi như liên hệ chung, không báo lỗi
        Room room = request.getRoomId() == null
                ? null
                : roomRepository.findById(request.getRoomId()).orElse(null);

        contactRepository.save(ContactMessage.builder()
                .fullName(fullName)
                .phone(phone)
                .email(email)
                .topic(request.getTopic())
                .message(message)
                .room(room)
                .status(ContactStatus.NEW)
                .ipAddress(clientIp)
                .build());
    }

    // =====================================================
    // HÀM DÙNG CHUNG: CHUYỂN ĐỔI DỮ LIỆU PHÒNG
    // =====================================================

    // Chỉ lấy ảnh chính (isThumbnail = true) của mỗi phòng, 1 query cho cả danh sách
    private Map<Long, String> getThumbnails(List<Room> rooms) {
        if (rooms.isEmpty()) {
            return Map.of();
        }

        List<Long> roomIds = rooms.stream().map(Room::getId).toList();

        Map<Long, String> thumbnails = new HashMap<>();

        // putIfAbsent để lỡ phòng có nhiều ảnh chính thì chỉ lấy một
        for (RoomImage image : roomImageRepository.findThumbnailsByRoomIds(roomIds)) {
            thumbnails.putIfAbsent(image.getRoom().getId(), image.getImageUrl());
        }

        return thumbnails;
    }

    // distanceKm chỉ có giá trị khi tìm theo vị trí, các trường hợp khác truyền null
    private PublicRoomResponse toResponse(Room room, String thumbnailUrl, Double distanceKm) {
        Building building = room.getBuilding();

        return PublicRoomResponse.builder()
                .id(room.getId())
                .roomNumber(room.getRoomNumber())
                .roomType(room.getRoomType())
                .maxOccupancy(room.getMaxOccupancy())
                .floor(room.getFloor())
                .area(room.getArea())
                .rentalPrice(room.getRentalPrice())
                .thumbnailUrl(thumbnailUrl)
                .buildingName(building.getName())
                .province(building.getProvince())
                .ward(building.getWard())
                // làm tròn 1 chữ số thập phân
                .distanceKm(distanceKm == null ? null : Math.round(distanceKm * 10.0) / 10.0)
                .build();
    }

    // Gói kết quả phân trang của Spring Data (trang đánh số từ 0) sang PageResponse (từ 1)
    private PageResponse<PublicRoomResponse> toPageResponse(List<PublicRoomResponse> items, Page<Room> page) {
        return PageResponse.<PublicRoomResponse>builder()
                .items(items)
                .currentPage(page.getNumber() + 1)
                .pageSize(page.getSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    // =====================================================
    // HÀM DÙNG CHUNG: CHUẨN HÓA DỮ LIỆU LIÊN HỆ
    // =====================================================

    // Bỏ ký tự điều khiển (trừ xuống dòng, tab) rồi cắt khoảng trắng hai đầu
    private String sanitize(String value) {
        return value.replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", "").trim();
    }

    // "0912 345 678" hoặc "+84912345678" thành "0912345678"
    private String normalizePhone(String raw) {
        String phone = raw.replaceAll("\\s+", "");
        return phone.startsWith("+84") ? "0" + phone.substring(3) : phone;
    }

    // Đếm số đường link (http://, https://, www.) trong nội dung
    private int countLinks(String text) {
        Matcher matcher = LINK_PATTERN.matcher(text);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}