package com.project.trosmart.dto.response;

import com.project.trosmart.enums.IssueCategory;
import com.project.trosmart.enums.IssuePriority;
import com.project.trosmart.enums.IssueStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

// Yêu cầu sửa chữa của khách. Không có chi phí sửa chữa, người phụ trách
@Getter
@Setter
@Builder
public class MyIssueResponse {

    private Long id;
    private String title;
    private String description;
    private IssueCategory category;
    private IssuePriority priority;
    private String note;
    private IssueStatus status;
    private LocalDateTime createdAt;
}