package com.project.trosmart.dto.response;

import com.project.trosmart.enums.NotificationPriority;
import com.project.trosmart.enums.NotificationStatus;
import com.project.trosmart.enums.NotificationTargetType;
import com.project.trosmart.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {
    private Long id;
    private String title;
    private NotificationType type;
    private NotificationPriority priority;
    private NotificationTargetType targetType;
    // Tên đối tượng nhận để hiển thị: "Tất cả khách thuê", tên tòa, "Phòng A301 · Tòa A", tên khách
    private String targetName;
    private NotificationStatus status;
    private LocalDateTime scheduledAt;
    private LocalDateTime sentAt;
    // Số người nhận và số người đã đọc (0 khi chưa gửi)
    private long recipientCount;
    private long readCount;
    private String createdBy;
    private LocalDateTime createdAt;
}
