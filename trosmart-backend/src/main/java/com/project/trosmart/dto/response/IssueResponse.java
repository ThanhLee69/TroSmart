package com.project.trosmart.dto.response;

import com.project.trosmart.enums.IssueCategory;
import com.project.trosmart.enums.IssuePriority;
import com.project.trosmart.enums.IssueStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueResponse {

    private Long id;

    private String title;

    private String description;

    private IssueCategory category;

    private IssuePriority priority;

    private IssueStatus status;

    private String roomNumber;

    private String buildingName;

    private String tenantName;

    private String note;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}