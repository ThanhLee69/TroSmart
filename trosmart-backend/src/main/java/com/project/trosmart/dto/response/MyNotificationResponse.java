package com.project.trosmart.dto.response;

import com.project.trosmart.enums.NotificationPriority;
import com.project.trosmart.enums.NotificationType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// Thông báo trong hộp thư của khách. id là id của thông báo
@Getter
@Setter
@Builder
public class MyNotificationResponse {

    private Long id;
    private String title;
    private String content;
    private NotificationType type;
    private NotificationPriority priority;
    private LocalDateTime sentAt;
    private Boolean isRead;
    private Long relatedId;
}