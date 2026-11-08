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
public class NotificationDetailResponse {
    private Long id;
    private String title;
    private String content;
    private NotificationType type;
    private NotificationPriority priority;
    private NotificationTargetType targetType;
    private String targetName;
    private Long buildingId;
    private String buildingName;
    private Long roomId;
    private String roomNumber;
    private Long tenantId;
    private String tenantName;
    private Long relatedId;
    private NotificationStatus status;
    private LocalDateTime scheduledAt;
    private LocalDateTime sentAt;
    private long recipientCount;
    private long readCount;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
