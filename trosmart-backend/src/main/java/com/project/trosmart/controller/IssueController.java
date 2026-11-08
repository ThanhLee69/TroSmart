package com.project.trosmart.controller;

import com.project.trosmart.dto.request.IssueStatusRequest;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.IssueDashboardResponse;
import com.project.trosmart.dto.response.IssueResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.IssueCategory;
import com.project.trosmart.enums.IssuePriority;
import com.project.trosmart.enums.IssueStatus;
import com.project.trosmart.service.IssueService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Quản lý sự cố và yêu cầu sửa chữa. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/issues")
@RequiredArgsConstructor
@Slf4j(topic = "ISSUE-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý sự cố",
        description = "API quản lý sự cố và yêu cầu sửa chữa do khách thuê gửi, chỉ dành cho quản trị viên (ADMIN)"
)
public class IssueController {

    private final IssueService issueService;

    @GetMapping
    @Operation(
            summary = "Xem danh sách yêu cầu sửa chữa",
            description = "Tìm kiếm, lọc theo trạng thái, loại sự cố, mức độ ưu tiên và phân trang"
    )
    public ApiResponse<PageResponse<IssueResponse>> getIssues(
            @Parameter(description = "Từ khóa tìm kiếm (tiêu đề, phòng...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo trạng thái xử lý. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) IssueStatus status,

            @Parameter(description = "Lọc theo loại sự cố. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) IssueCategory category,

            @Parameter(description = "Lọc theo mức độ ưu tiên. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) IssuePriority priority,

            @Parameter(description = "Số trang, bắt đầu từ 1", example = "1")
            @RequestParam(defaultValue = "1")
            @Min(value = 1, message = "Trang phải lớn hơn hoặc bằng 1")
            int page,

            @Parameter(description = "Số bản ghi mỗi trang, từ 1 đến 100", example = "10")
            @RequestParam(defaultValue = "10")
            @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
            @Max(value = 100, message = "Kích thước trang tối đa là 100")
            int size
    ) {
        PageResponse<IssueResponse> response = issueService.getIssues(
                keyword,
                status,
                category,
                priority,
                page,
                size
        );

        return ApiResponse.<PageResponse<IssueResponse>>builder()
                .code(200)
                .message("Get issues successfully")
                .result(response)
                .build();
    }

    @GetMapping("/dashboard")
    @Operation(
            summary = "Xem thống kê yêu cầu sửa chữa",
            description = "Trả về tổng số yêu cầu, số đang chờ, đang xử lý và đã hoàn thành"
    )
    public ApiResponse<IssueDashboardResponse> getIssueDashboard() {
        IssueDashboardResponse response = issueService.getIssueDashboard();

        return ApiResponse.<IssueDashboardResponse>builder()
                .code(200)
                .message("Get issue dashboard successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết yêu cầu sửa chữa",
            description = "Lấy thông tin chi tiết một yêu cầu sửa chữa theo ID"
    )
    public ApiResponse<IssueResponse> getIssueById(
            @Parameter(description = "ID yêu cầu sửa chữa", example = "1")
            @PathVariable Long id
    ) {
        IssueResponse response = issueService.getIssueById(id);

        return ApiResponse.<IssueResponse>builder()
                .code(200)
                .message("Get issue successfully")
                .result(response)
                .build();
    }

    @PatchMapping("/{id}/status")
    @Operation(
            summary = "Cập nhật trạng thái yêu cầu",
            description = "Chủ trọ cập nhật trạng thái xử lý của yêu cầu sửa chữa"
    )
    public ApiResponse<IssueResponse> updateIssueStatus(
            @Parameter(description = "ID yêu cầu sửa chữa", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody IssueStatusRequest request
    ) {
        IssueResponse response = issueService.updateIssueStatus(
                id,
                request.getStatus()
        );

        return ApiResponse.<IssueResponse>builder()
                .code(200)
                .message("Issue status updated successfully")
                .result(response)
                .build();
    }

    @PatchMapping("/{id}/cancel")
    @Operation(
            summary = "Hủy yêu cầu sửa chữa",
            description = "Hủy yêu cầu đang chờ tiếp nhận hoặc đã tiếp nhận nhưng chưa bắt đầu xử lý"
    )
    public ApiResponse<IssueResponse> cancelIssue(
            @Parameter(description = "ID yêu cầu sửa chữa", example = "1")
            @PathVariable Long id
    ) {
        IssueResponse response = issueService.cancelIssue(id);

        return ApiResponse.<IssueResponse>builder()
                .code(200)
                .message("Issue cancelled successfully")
                .result(response)
                .build();
    }
}