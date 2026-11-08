package com.project.trosmart.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.response.RoomImageResponse;
import com.project.trosmart.entity.Room;
import com.project.trosmart.entity.RoomImage;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.RoomImageMapper;
import com.project.trosmart.repository.RoomImageRepository;
import com.project.trosmart.repository.RoomRepository;
import com.project.trosmart.service.RoomImageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Quản lý ảnh phòng: lưu file trên Cloudinary, lưu đường dẫn và ảnh đại diện trong database.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RoomImageServiceImpl implements RoomImageService {

    // =====================================================
    // CẤU HÌNH VÀ PHỤ THUỘC
    // =====================================================

    private static final int MAX_IMAGES_PER_ROOM = 9;

    // 5 MB
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;

    private static final List<String> ALLOWED_CONTENT_TYPES =
            List.of("image/jpeg", "image/png", "image/webp");

    private final Cloudinary cloudinary;
    private final RoomRepository roomRepository;
    private final RoomImageRepository roomImageRepository;
    private final RoomImageMapper roomImageMapper;

    // =====================================================
    // 1. XEM DANH SÁCH ẢNH
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<RoomImageResponse> getRoomImages(Long roomId) {
        getActiveRoom(roomId);

        // Ảnh đại diện đứng đầu, các ảnh còn lại theo thứ tự tải lên
        List<RoomImage> images =
                roomImageRepository.findByRoom_IdOrderByIsThumbnailDescIdAsc(roomId);

        return roomImageMapper.toResponseList(images);
    }

    // =====================================================
    // 2. TẢI ẢNH LÊN
    // =====================================================

    /**
     * Kiểm tra hết các file trước, rồi mới tải lên Cloudinary từng ảnh.
     * Giữa chừng lỗi thì xóa các ảnh đã tải để không để lại file rác trên Cloudinary.
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<RoomImageResponse> uploadImages(
            Long roomId,
            List<MultipartFile> files
    ) {
        Room room = getActiveRoom(roomId);

        if (files == null || files.isEmpty()) {
            throw new AppException(ErrorCode.ROOM_IMAGE_FILE_EMPTY);
        }

        // Tổng ảnh sau khi tải không được vượt giới hạn
        long currentImageCount = roomImageRepository.countByRoom_Id(roomId);

        if (currentImageCount + files.size() > MAX_IMAGES_PER_ROOM) {
            throw new AppException(ErrorCode.ROOM_IMAGE_LIMIT_EXCEEDED);
        }

        // Kiểm tra toàn bộ ảnh trước khi tải, tránh tải được một nửa rồi mới báo lỗi
        for (MultipartFile file : files) {
            validateImage(file);
        }

        // Phòng chưa có ảnh đại diện thì ảnh đầu tiên trong lượt này sẽ làm ảnh đại diện
        boolean hasThumbnail = roomImageRepository
                .findByRoom_IdAndIsThumbnailTrue(roomId)
                .isPresent();

        List<RoomImage> imagesToSave = new ArrayList<>();
        // Ghi lại các ảnh đã tải thành công để dọn nếu có lỗi
        List<String> uploadedPublicIds = new ArrayList<>();

        try {
            for (MultipartFile file : files) {
                String publicId = "rooms/room_" + UUID.randomUUID();

                Map<?, ?> uploadResult = cloudinary.uploader().upload(
                        file.getBytes(),
                        ObjectUtils.asMap(
                                "public_id", publicId,
                                "overwrite", false,
                                "resource_type", "image"
                        )
                );

                uploadedPublicIds.add(publicId);

                String imageUrl = (String) uploadResult.get("secure_url");

                if (imageUrl == null || imageUrl.isBlank()) {
                    throw new IllegalStateException("Cloudinary không trả về URL ảnh");
                }

                boolean isThumbnail = !hasThumbnail && imagesToSave.isEmpty();

                imagesToSave.add(RoomImage.builder()
                        .imageUrl(imageUrl)
                        .publicId(publicId)
                        .isThumbnail(isThumbnail)
                        .room(room)
                        .build());
            }

            List<RoomImage> savedImages = roomImageRepository.saveAll(imagesToSave);

            return roomImageMapper.toResponseList(savedImages);

        } catch (Exception e) {
            cleanupUploadedImages(uploadedPublicIds);

            log.error("Failed to upload images for room {}", roomId, e);

            // Lỗi nghiệp vụ giữ nguyên, lỗi khác (mạng, Cloudinary, đọc file) gộp thành lỗi tải ảnh
            if (e instanceof AppException appException) {
                throw appException;
            }

            throw new AppException(ErrorCode.ROOM_IMAGE_UPLOAD_FAILED);
        }
    }

    // =====================================================
    // 3. ĐẶT ẢNH ĐẠI DIỆN
    // =====================================================

    @Override
    @Transactional
    public RoomImageResponse setThumbnail(Long roomId, Long imageId) {
        getActiveRoom(roomId);

        // Tìm theo cả roomId để không đặt nhầm ảnh của phòng khác
        RoomImage targetImage = roomImageRepository
                .findByIdAndRoom_Id(imageId, roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_IMAGE_NOT_FOUND));

        // Mỗi phòng chỉ có một ảnh đại diện: bỏ cờ ở ảnh cũ (nếu khác ảnh được chọn)
        roomImageRepository.findByRoom_IdAndIsThumbnailTrue(roomId)
                .filter(image -> !image.getId().equals(imageId))
                .ifPresent(image -> {
                    image.setIsThumbnail(false);
                    roomImageRepository.save(image);
                });

        targetImage.setIsThumbnail(true);

        RoomImage savedImage = roomImageRepository.save(targetImage);

        return roomImageMapper.toRoomImageResponse(savedImage);
    }

    // =====================================================
    // 4. XÓA ẢNH
    // =====================================================

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteImage(Long roomId, Long imageId) {
        getActiveRoom(roomId);

        RoomImage image = roomImageRepository
                .findByIdAndRoom_Id(imageId, roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_IMAGE_NOT_FOUND));

        boolean wasThumbnail = Boolean.TRUE.equals(image.getIsThumbnail());

        // Xóa file trên Cloudinary trước. "not found" coi như đã xóa rồi, vẫn cho xóa trong database
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(
                    image.getPublicId(),
                    ObjectUtils.asMap("resource_type", "image")
            );

            Object status = result.get("result");

            if (!"ok".equals(status) && !"not found".equals(status)) {
                throw new AppException(ErrorCode.ROOM_IMAGE_DELETE_FAILED);
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to delete image {} from Cloudinary", imageId, e);

            throw new AppException(ErrorCode.ROOM_IMAGE_DELETE_FAILED);
        }

        // flush để lệnh xóa chạy xong trước khi truy vấn danh sách ảnh còn lại bên dưới
        roomImageRepository.delete(image);
        roomImageRepository.flush();

        // Xóa đúng ảnh đại diện thì chọn ảnh còn lại đầu tiên làm đại diện mới
        if (wasThumbnail) {
            List<RoomImage> remainingImages =
                    roomImageRepository.findByRoom_IdOrderByIsThumbnailDescIdAsc(roomId);

            if (!remainingImages.isEmpty()) {
                RoomImage nextThumbnail = remainingImages.get(0);
                nextThumbnail.setIsThumbnail(true);
                roomImageRepository.save(nextThumbnail);
            }
        }
    }

    // =====================================================
    // HÀM DÙNG CHUNG
    // =====================================================

    // Lấy phòng chưa bị xóa, không có thì báo không tìm thấy phòng
    private Room getActiveRoom(Long roomId) {
        return roomRepository.findActiveRoomById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
    }

    // Kiểm tra file không rỗng, không quá 5 MB và đúng định dạng JPEG, PNG hoặc WebP
    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.ROOM_IMAGE_FILE_EMPTY);
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AppException(ErrorCode.ROOM_IMAGE_FILE_TOO_LARGE);
        }

        String contentType = file.getContentType();

        if (contentType == null
                || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new AppException(ErrorCode.ROOM_IMAGE_INVALID_TYPE);
        }
    }

    // Xóa các ảnh đã tải lên Cloudinary khi tải lên thất bại. Lỗi khi dọn chỉ ghi log, không ném tiếp
    private void cleanupUploadedImages(List<String> publicIds) {
        for (String publicId : publicIds) {
            try {
                cloudinary.uploader().destroy(
                        publicId,
                        ObjectUtils.asMap("resource_type", "image")
                );
            } catch (Exception e) {
                log.error("Failed to clean up Cloudinary image: {}", publicId, e);
            }
        }
    }
}