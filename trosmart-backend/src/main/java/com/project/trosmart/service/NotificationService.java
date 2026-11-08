package com.project.trosmart.service;

import com.project.trosmart.dto.request.NotificationRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.NotificationStatus;
import com.project.trosmart.enums.NotificationTargetType;
import com.project.trosmart.enums.NotificationType;

import java.util.List;

public interface NotificationService {

    // Danh sách thông báo (admin): lọc theo loại, trạng thái, đối tượng nhận; tìm theo tiêu đề
    PageResponse<NotificationResponse> getNotifications(
            NotificationType type,
            NotificationStatus status,
            NotificationTargetType targetType,
            String keyword,
            int page,
            int size
    );

    // Chi tiết kèm số người nhận và số người đã đọc
    NotificationDetailResponse getNotificationById(Long id);

    // Soạn thông báo: không có scheduledAt -> DRAFT, có scheduledAt -> SCHEDULED
    NotificationDetailResponse createNotification(NotificationRequest request);

    // Sửa thông báo, chỉ khi DRAFT hoặc SCHEDULED
    NotificationDetailResponse updateNotification(Long id, NotificationRequest request);

    // Gửi ngay: bung đối tượng nhận thành danh sách khách đang ở rồi chuyển SENT
    NotificationDetailResponse sendNotification(Long id);


    // Xóa mềm, chỉ khi DRAFT hoặc CANCELLED
    void deleteNotification(Long id);

    // Danh sách người nhận và trạng thái đã đọc
    PageResponse<NotificationRecipientResponse> getRecipients(
            Long id,
            Boolean isRead,
            int page,
            int size
    );

    // Job: gửi các thông báo hẹn giờ đã đến hạn, trả về số thông báo đã gửi
    int sendScheduledNotifications();

    NotificationDashboardResponse getNotificationDashboard();

    List<NotificationTargetOptionResponse> getTargetOptions(
            NotificationTargetType targetType,
            String keyword
    );
}
