package com.project.trosmart.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueDashboardResponse {

    private long totalIssues;
    private long pendingIssues;
    private long inProgressIssues;
    private long completedIssues;
}