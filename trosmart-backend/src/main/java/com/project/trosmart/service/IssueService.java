
package com.project.trosmart.service;

import com.project.trosmart.dto.response.IssueDashboardResponse;
import com.project.trosmart.dto.response.IssueResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.IssueCategory;
import com.project.trosmart.enums.IssuePriority;
import com.project.trosmart.enums.IssueStatus;


public interface IssueService {

    // Lấy danh sách yêu cầu sửa chữa, tìm kiếm, lọc và phân trang
    PageResponse<IssueResponse> getIssues(
            String keyword,
            IssueStatus status,
            IssueCategory category,
            IssuePriority priority,
            int page,
            int size
    );

    // Lấy chi tiết yêu cầu sửa chữa
    IssueResponse getIssueById(Long issueId);

    // Cập nhật trạng thái yêu cầu sửa chữa
    IssueResponse updateIssueStatus(Long issueId, IssueStatus status);

    // Thống kê tổng quan yêu cầu sửa chữa
    IssueDashboardResponse getIssueDashboard();

    IssueResponse cancelIssue(Long issueId);
}

