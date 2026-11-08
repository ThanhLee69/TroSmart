package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.NotificationRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.entity.Notification;
import com.project.trosmart.entity.NotificationRecipient;
import com.project.trosmart.entity.Tenant;
import com.project.trosmart.enums.NotificationPriority;
import com.project.trosmart.enums.NotificationStatus;
import com.project.trosmart.enums.NotificationTargetType;
import com.project.trosmart.enums.NotificationType;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.NotificationMapper;
import com.project.trosmart.repository.BuildingRepository;
import com.project.trosmart.repository.NotificationRecipientRepository;
import com.project.trosmart.repository.NotificationRepository;
import com.project.trosmart.repository.RoomRepository;
import com.project.trosmart.repository.TenantRepository;
import com.project.trosmart.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "NOTIFICATION-SERVICE")
public class NotificationServiceImpl implements NotificationService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final int TARGET_OPTION_LIMIT = 20;

    // Chủ trọ chỉ tự soạn hai loại này, các loại còn lại do hệ thống tạo
    private static final Set<NotificationType> ADMIN_TYPES =
            EnumSet.of(NotificationType.ANNOUNCEMENT, NotificationType.MAINTENANCE);

    private static final Set<NotificationStatus> EDITABLE_STATUSES =
            EnumSet.of(NotificationStatus.DRAFT, NotificationStatus.SCHEDULED);

    private static final Set<NotificationStatus> DELETABLE_STATUSES =
            EnumSet.of(NotificationStatus.DRAFT, NotificationStatus.SCHEDULED);

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final NotificationMapper notificationMapper;
    private final BuildingRepository buildingRepository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;
    private final PlatformTransactionManager transactionManager;

    // =========================
    // DANH SÁCH
    // =========================
    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getNotifications(
            NotificationType type,
            NotificationStatus status,
            NotificationTargetType targetType,
            String keyword,
            int page,
            int size
    ) {

        Page<Notification> result = notificationRepository.searchNotifications(
                type,
                status,
                targetType,
                buildKeywordPattern(keyword),
                PageRequest.of(page - 1, size)
        );

        Map<Long, long[]> counts = loadCounts(
                result.getContent().stream().map(Notification::getId).toList());

        List<NotificationResponse> items = result.getContent().stream()
                .map(notification -> {
                    NotificationResponse response =
                            notificationMapper.toNotificationResponse(notification);
                    response.setTargetName(buildTargetName(notification));

                    long[] count = counts.getOrDefault(notification.getId(), new long[]{0, 0});
                    response.setRecipientCount(count[0]);
                    response.setReadCount(count[1]);

                    return response;
                })
                .toList();

        return PageResponse.<NotificationResponse>builder()
                .items(items)
                .currentPage(result.getNumber() + 1)
                .pageSize(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    // =========================
    // CHI TIẾT
    // =========================
    @Override
    @Transactional(readOnly = true)
    public NotificationDetailResponse getNotificationById(Long id) {
        Notification notification = notificationRepository.findActiveById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));

        return buildDetail(notification);
    }

    // =========================
    // SOẠN
    // =========================
    @Override
    @Transactional
    public NotificationDetailResponse createNotification(NotificationRequest request) {
        Notification notification = new Notification();
        applyRequest(notification, request);

        notification = notificationRepository.save(notification);

        log.info("Created notification id={}, status={}", notification.getId(), notification.getStatus());

        return buildDetail(notification);
    }

    // =========================
    // SỬA
    // =========================
    @Override
    @Transactional
    public NotificationDetailResponse updateNotification(Long id, NotificationRequest request) {
        Notification notification = notificationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));

        if (!EDITABLE_STATUSES.contains(notification.getStatus())) {
            throw new AppException(ErrorCode.NOTIFICATION_INVALID_STATUS);
        }

        applyRequest(notification, request);

        notification = notificationRepository.save(notification);

        return buildDetail(notification);
    }

    // =========================
    // GỬI NGAY
    // =========================
    @Override
    @Transactional
    public NotificationDetailResponse sendNotification(Long id) {
        Notification notification = doSend(id, false);

        return buildDetail(notification);
    }

    // =========================
    // XÓA
    // =========================
    @Override
    @Transactional
    public void deleteNotification(Long id) {
        Notification notification = notificationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));

        if (!DELETABLE_STATUSES.contains(notification.getStatus())) {
            throw new AppException(ErrorCode.NOTIFICATION_INVALID_STATUS);
        }

        notification.setDeleted(true);
        notificationRepository.save(notification);
    }

    // =========================
    // NGƯỜI NHẬN
    // =========================
    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationRecipientResponse> getRecipients(
            Long id,
            Boolean isRead,
            int page,
            int size
    ) {

        if (!notificationRepository.existsByIdAndDeletedFalse(id)) {
            throw new AppException(ErrorCode.NOTIFICATION_NOT_FOUND);
        }

        Page<NotificationRecipient> result = recipientRepository.findRecipients(
                id, isRead, PageRequest.of(page - 1, size));

        return PageResponse.<NotificationRecipientResponse>builder()
                .items(result.getContent().stream()
                        .map(notificationMapper::toRecipientResponse)
                        .toList())
                .currentPage(result.getNumber() + 1)
                .pageSize(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    // =========================
    // THỐNG KÊ
    // =========================
    @Override
    @Transactional(readOnly = true)
    public NotificationDashboardResponse getNotificationDashboard() {
        Map<NotificationStatus, Long> counts =
                new EnumMap<>(NotificationStatus.class);

        for (Object[] row : notificationRepository.countGroupByStatus()) {
            counts.put((NotificationStatus) row[0], (Long) row[1]);
        }

        long total = counts.values().stream()
                .mapToLong(Long::longValue)
                .sum();

        return NotificationDashboardResponse.builder()
                .totalCount(total)
                .sentCount(counts.getOrDefault(NotificationStatus.SENT, 0L))
                .draftCount(counts.getOrDefault(NotificationStatus.DRAFT, 0L))
                .scheduledCount(counts.getOrDefault(NotificationStatus.SCHEDULED, 0L))
                .nextScheduledAt(notificationRepository.findNextScheduledAt())
                .build();
    }

    // =========================
    // GỢI Ý ĐỐI TƯỢNG NHẬN
    // =========================
    @Override
    @Transactional(readOnly = true)
    public List<NotificationTargetOptionResponse> getTargetOptions(
            NotificationTargetType targetType,
            String keyword
    ) {
        if (targetType == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        PageRequest limit = PageRequest.of(0, TARGET_OPTION_LIMIT);

        switch (targetType) {
            case BUILDING:
                // Query của tòa nhà tự bọc %...%, nên truyền keyword gốc (rỗng = null = tất cả)
                String rawKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();

                return buildingRepository.findActiveBuildingOptions(rawKeyword, limit).stream()
                        .map(building -> NotificationTargetOptionResponse.builder()
                                .value(building.getId())
                                .label(building.getName())
                                .description(building.getAddress())
                                .build())
                        .toList();

            case ROOM:
                // Query của phòng và khách dùng LIKE :keyword ESCAPE nên cần chuỗi %...% đã escape
                return roomRepository.findOccupiedRoomOptions(buildKeywordPattern(keyword), limit).stream()
                        .map(room -> NotificationTargetOptionResponse.builder()
                                .value(room.getId())
                                .label("Phòng " + room.getRoomNumber())
                                .description(room.getBuilding().getName())
                                .build())
                        .toList();

            case TENANT:
                return tenantRepository.findRentingTenantOptions(buildKeywordPattern(keyword), limit).stream()
                        .map(tenant -> NotificationTargetOptionResponse.builder()
                                .value(tenant.getId())
                                .label(tenant.getFullName())
                                .description(tenant.getPhone())
                                .build())
                        .toList();

            default:
                // ALL không cần chọn đối tượng
                return List.of();
        }
    }

    // =========================
    // JOB: GỬI THÔNG BÁO HẸN GIỜ
    // =========================
    // Không đặt @Transactional ở đây: mỗi thông báo gửi trong một giao dịch riêng,
    // một thông báo lỗi không kéo theo các thông báo khác bị hủy
    @Override
    public int sendScheduledNotifications() {
        List<Long> ids = notificationRepository.findDueScheduledIds(
                LocalDateTime.now(VIETNAM_ZONE));

        if (ids.isEmpty()) {
            return 0;
        }

        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        int sent = 0;

        for (Long id : ids) {
            try {
                Boolean ok = transaction.execute(status -> doSend(id, true).getStatus()
                        == NotificationStatus.SENT);

                if (Boolean.TRUE.equals(ok)) {
                    sent++;
                }
            } catch (Exception e) {
                log.error("Failed to send scheduled notification id={}", id, e);
            }
        }

        log.info("Sent {}/{} scheduled notifications", sent, ids.size());

        return sent;
    }

    // =========================
    // HÀM NỘI BỘ
    // =========================

    // Gửi thông báo trong giao dịch hiện tại.
    // scheduledRun = true (từ job): không có người nhận thì đưa về DRAFT thay vì báo lỗi
    private Notification doSend(Long id, boolean scheduledRun) {
        Notification notification = notificationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));

        // Đã gửi (hoặc đã bị xóa) bởi luồng khác thì bỏ qua (job) hoặc báo lỗi (gửi tay)
        if (!EDITABLE_STATUSES.contains(notification.getStatus())) {
            if (scheduledRun) {
                return notification;
            }
            throw new AppException(ErrorCode.NOTIFICATION_INVALID_STATUS);
        }

        List<Tenant> tenants = resolveRecipients(notification);

        if (tenants.isEmpty()) {
            if (!scheduledRun) {
                throw new AppException(ErrorCode.NOTIFICATION_NO_RECIPIENT);
            }

            // Về bản nháp và bỏ giờ hẹn để job không quét lại, chủ trọ có thể sửa rồi gửi lại
            log.warn("Scheduled notification id={} has no recipient, moved back to draft", id);
            notification.setStatus(NotificationStatus.DRAFT);
            notification.setScheduledAt(null);
            return notificationRepository.save(notification);
        }

        List<NotificationRecipient> recipients = tenants.stream()
                .map(tenant -> NotificationRecipient.builder()
                        .notification(notification)
                        .tenant(tenant)
                        .isRead(false)
                        .build())
                .toList();

        recipientRepository.saveAll(recipients);

        notification.setStatus(NotificationStatus.SENT);
        notification.setSentAt(LocalDateTime.now(VIETNAM_ZONE));

        log.info("Sent notification id={} to {} recipients", id, recipients.size());

        return notificationRepository.save(notification);
    }

    // Bung đối tượng nhận thành danh sách khách thật tại thời điểm gửi.
    // Chỉ khách đã có tài khoản mới nhận được (mới vào xem được thông báo)
    private List<Tenant> resolveRecipients(Notification notification) {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        switch (notification.getTargetType()) {
            case ALL:
                return notificationRepository.findResidingTenants(null, null, today);

            case BUILDING:
                if (notification.getBuilding() == null) {
                    return List.of();
                }
                return notificationRepository.findResidingTenants(
                        notification.getBuilding().getId(), null, today);

            case ROOM:
                if (notification.getRoom() == null) {
                    return List.of();
                }
                return notificationRepository.findResidingTenants(
                        null, notification.getRoom().getId(), today);

            case TENANT:
                Tenant tenant = notification.getTenant();
                if (tenant == null
                        || Boolean.TRUE.equals(tenant.getDeleted())
                        || tenant.getUser() == null) {
                    return List.of();
                }
                return List.of(tenant);

            default:
                return List.of();
        }
    }

    // Gán dữ liệu từ request vào thông báo (dùng cho cả tạo và sửa)
    private void applyRequest(Notification notification, NotificationRequest request) {
        if (!ADMIN_TYPES.contains(request.getType())) {
            throw new AppException(ErrorCode.NOTIFICATION_INVALID_TYPE);
        }

        String title = request.getTitle() == null ? "" : request.getTitle().trim();
        String content = request.getContent() == null ? "" : request.getContent().trim();

        if (title.isEmpty() || content.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        LocalDateTime scheduledAt = request.getScheduledAt();

        if (scheduledAt != null && !scheduledAt.isAfter(LocalDateTime.now(VIETNAM_ZONE))) {
            throw new AppException(ErrorCode.NOTIFICATION_INVALID_SCHEDULE);
        }

        notification.setBuilding(null);
        notification.setRoom(null);
        notification.setTenant(null);

        switch (request.getTargetType()) {
            case ALL:
                break;

            case BUILDING:
                if (request.getBuildingId() == null) {
                    throw new AppException(ErrorCode.NOTIFICATION_INVALID_TARGET);
                }
                notification.setBuilding(
                        buildingRepository.findById(request.getBuildingId())
                                .filter(building -> !Boolean.TRUE.equals(building.getDeleted()))
                                .orElseThrow(() -> new AppException(ErrorCode.BUILDING_NOT_FOUND)));
                break;

            case ROOM:
                if (request.getRoomId() == null) {
                    throw new AppException(ErrorCode.NOTIFICATION_INVALID_TARGET);
                }
                notification.setRoom(
                        roomRepository.findById(request.getRoomId())
                                .filter(room -> !Boolean.TRUE.equals(room.getDeleted()))
                                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND)));
                break;

            case TENANT:
                if (request.getTenantId() == null) {
                    throw new AppException(ErrorCode.NOTIFICATION_INVALID_TARGET);
                }
                notification.setTenant(
                        tenantRepository.findById(request.getTenantId())
                                .filter(tenant -> !Boolean.TRUE.equals(tenant.getDeleted()))
                                .orElseThrow(() -> new AppException(ErrorCode.TENANT_NOT_FOUND)));
                break;

            default:
                throw new AppException(ErrorCode.NOTIFICATION_INVALID_TARGET);
        }

        notification.setTitle(title);
        notification.setContent(content);
        notification.setType(request.getType());
        notification.setPriority(request.getPriority() != null
                ? request.getPriority()
                : NotificationPriority.NORMAL);
        notification.setTargetType(request.getTargetType());
        notification.setScheduledAt(scheduledAt);
        notification.setStatus(scheduledAt != null
                ? NotificationStatus.SCHEDULED
                : NotificationStatus.DRAFT);
    }

    private NotificationDetailResponse buildDetail(Notification notification) {
        NotificationDetailResponse response =
                notificationMapper.toNotificationDetailResponse(notification);

        response.setTargetName(buildTargetName(notification));

        long[] count = loadCounts(List.of(notification.getId()))
                .getOrDefault(notification.getId(), new long[]{0, 0});
        response.setRecipientCount(count[0]);
        response.setReadCount(count[1]);

        return response;
    }

    private String buildTargetName(Notification notification) {
        switch (notification.getTargetType()) {
            case ALL:
                return "Tất cả khách thuê";

            case BUILDING:
                return notification.getBuilding() != null
                        ? notification.getBuilding().getName()
                        : "—";

            case ROOM:
                if (notification.getRoom() == null) {
                    return "—";
                }
                String buildingName = notification.getRoom().getBuilding() != null
                        ? " · " + notification.getRoom().getBuilding().getName()
                        : "";
                return "Phòng " + notification.getRoom().getRoomNumber() + buildingName;

            case TENANT:
                return notification.getTenant() != null
                        ? notification.getTenant().getFullName()
                        : "—";

            default:
                return "—";
        }
    }

    // notificationId -> [tổng người nhận, số đã đọc]
    private Map<Long, long[]> loadCounts(Collection<Long> notificationIds) {
        Map<Long, long[]> counts = new HashMap<>();

        if (notificationIds.isEmpty()) {
            return counts;
        }

        for (Object[] row : recipientRepository.countByNotificationIds(notificationIds)) {
            counts.put(
                    ((Number) row[0]).longValue(),
                    new long[]{
                            ((Number) row[1]).longValue(),
                            row[2] == null ? 0 : ((Number) row[2]).longValue()
                    }
            );
        }

        return counts;
    }

    private String buildKeywordPattern(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return "%";
        }

        String escaped = keyword.trim()
                .toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");

        return "%" + escaped + "%";
    }
}