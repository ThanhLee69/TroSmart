package com.project.trosmart.dto.response;

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
public class NotificationRecipientResponse {
    private Long id;
    private Long tenantId;
    private String tenantName;
    private String tenantPhone;
    private Boolean isRead;
    private LocalDateTime readAt;
}
