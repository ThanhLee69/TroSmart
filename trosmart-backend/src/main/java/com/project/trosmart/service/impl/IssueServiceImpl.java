package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.response.IssueDashboardResponse;
import com.project.trosmart.dto.response.IssueResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.entity.Issue;
import com.project.trosmart.enums.IssueCategory;
import com.project.trosmart.enums.IssuePriority;
import com.project.trosmart.enums.IssueStatus;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.IssueMapper;
import com.project.trosmart.repository.IssueRepository;
import com.project.trosmart.service.IssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IssueServiceImpl implements IssueService {

    private final IssueRepository issueRepository;
    private final IssueMapper issueMapper;

    /**
     * Lấy danh sách yêu cầu sửa chữa
     */
    @Override
    @Transactional(readOnly = true)
    public PageResponse<IssueResponse> getIssues(
            String keyword,
            IssueStatus status,
            IssueCategory category,
            IssuePriority priority,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        String searchKeyword = (keyword == null || keyword.isBlank())
                ? null
                : keyword.trim();

        Page<Issue> issues = issueRepository.findIssues(
                searchKeyword,
                status,
                category,
                priority,
                pageable
        );

        return toPage(issues, issueMapper::toResponse);
    }

    /**
     * Lấy chi tiết yêu cầu sửa chữa
     */
    @Override
    @Transactional(readOnly = true)
    public IssueResponse getIssueById(Long issueId) {
        Issue issue = findIssueById(issueId);

        return issueMapper.toResponse(issue);
    }

    /**
     * Cập nhật trạng thái yêu cầu sửa chữa
     */
    @Override
    @Transactional
    public IssueResponse updateIssueStatus(
            Long issueId,
            IssueStatus status
    ) {
        Issue issue = findIssueById(issueId);

        IssueStatus currentStatus = issue.getStatus();

        if (!isValidStatusTransition(currentStatus, status)) {
            throw new AppException(ErrorCode.ISSUE_INVALID_STATUS);
        }

        issue.setStatus(status);

        Issue savedIssue = issueRepository.save(issue);

        return issueMapper.toResponse(savedIssue);
    }

    /**
     * Thống kê yêu cầu sửa chữa
     */
    @Override
    @Transactional(readOnly = true)
    public IssueDashboardResponse getIssueDashboard() {
        return IssueDashboardResponse.builder()
                .totalIssues(issueRepository.countByDeletedFalse())
                .pendingIssues(
                        issueRepository.countByStatusAndDeletedFalse(
                                IssueStatus.PENDING
                        )
                )
                .inProgressIssues(
                        issueRepository.countByStatusAndDeletedFalse(
                                IssueStatus.IN_PROGRESS
                        )
                )
                .completedIssues(
                        issueRepository.countByStatusAndDeletedFalse(
                                IssueStatus.COMPLETED
                        )
                )
                .build();
    }

    /**
     * Hủy yêu cầu sửa chữa
     */
    @Override
    @Transactional
    public IssueResponse cancelIssue(Long issueId) {
        Issue issue = findIssueById(issueId);

        if (issue.getStatus() != IssueStatus.PENDING
                && issue.getStatus() != IssueStatus.ACCEPTED) {
            throw new AppException(ErrorCode.ISSUE_INVALID_STATUS);
        }

        issue.setStatus(IssueStatus.CANCELLED);

        Issue savedIssue = issueRepository.save(issue);

        return issueMapper.toResponse(savedIssue);
    }

    /**
     * Tìm yêu cầu sửa chữa theo ID và kiểm tra chưa bị xóa
     */
    private Issue findIssueById(Long issueId) {
        return issueRepository.findById(issueId)
                .filter(issue -> !Boolean.TRUE.equals(issue.getDeleted()))
                .orElseThrow(() ->
                        new AppException(ErrorCode.ISSUE_NOT_FOUND)
                );
    }

    /**
     * Kiểm tra quy trình chuyển trạng thái
     */
    private boolean isValidStatusTransition(
            IssueStatus currentStatus,
            IssueStatus newStatus
    ) {
        if (currentStatus == null || newStatus == null) {
            return false;
        }

        return switch (currentStatus) {
            case PENDING -> newStatus == IssueStatus.ACCEPTED;
            case ACCEPTED -> newStatus == IssueStatus.IN_PROGRESS;
            case IN_PROGRESS -> newStatus == IssueStatus.COMPLETED;
            default -> false;
        };
    }

    /**
     * Chuyển Page Entity sang PageResponse
     */
    private <E, R> PageResponse<R> toPage(
            Page<E> page,
            java.util.function.Function<E, R> mapper
    ) {
        return PageResponse.<R>builder()
                .items(page.getContent().stream().map(mapper).toList())
                .currentPage(page.getNumber() + 1)
                .pageSize(page.getSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}