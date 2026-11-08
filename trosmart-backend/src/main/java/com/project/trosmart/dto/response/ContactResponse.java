package com.project.trosmart.dto.response;

import com.project.trosmart.enums.ContactStatus;
import com.project.trosmart.enums.ContactTopic;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ContactResponse {

    private Long id;
    private String fullName;
    private String phone;
    private String email;
    private ContactTopic topic;
    private String message;

    // Phòng khách quan tâm (null nếu liên hệ chung)
    private Long roomId;
    private String roomNumber;
    private String buildingName;

    private ContactStatus status;
    private String adminNote;
    private LocalDateTime sentAt;
}
