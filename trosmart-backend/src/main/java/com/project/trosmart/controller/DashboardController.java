
package com.project.trosmart.controller;

import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.DashboardRevenueResponse;
import com.project.trosmart.dto.response.DashboardSummaryResponse;
import com.project.trosmart.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Tổng quan",
        description = "API số liệu cho trang Tổng quan của quản trị viên (ADMIN)"
)
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(
            summary = "Số liệu tổng quan",
            description = "Tỷ lệ lấp đầy, tiền phòng tháng này, công nợ, việc cần xử lý, "
                    + "trạng thái phòng theo tòa nhà và hai bảng hóa đơn quá hạn, hợp đồng sắp hết hạn"
    )
    public ApiResponse<DashboardSummaryResponse> getSummary(
            @Parameter(description = "Lọc theo tòa nhà. Bỏ trống để xem tất cả")
            @RequestParam(required = false) Long buildingId
    ) {
        return ApiResponse.<DashboardSummaryResponse>builder()
                .code(200)
                .message("Get dashboard summary successfully")
                .result(dashboardService.getSummary(buildingId))
                .build();
    }

    @GetMapping("/revenue")
    @Operation(
            summary = "Doanh thu theo tháng",
            description = "mode=year: đủ 12 tháng của một năm (tháng chưa tới để trống); "
                    + "mode=last12: 12 tháng gần nhất. Tính theo kỳ hóa đơn, bỏ hóa đơn đã hủy"
    )
    public ApiResponse<DashboardRevenueResponse> getRevenue(
            @Parameter(description = "year hoặc last12", example = "year")
            @RequestParam(defaultValue = "year") String mode,

            @Parameter(description = "Năm cần xem (chỉ dùng khi mode=year). Bỏ trống là năm hiện tại", example = "2026")
            @RequestParam(required = false)
            @Min(value = 2000, message = "Năm không hợp lệ")
            @Max(value = 2100, message = "Năm không hợp lệ")
            Integer year,

            @Parameter(description = "Lọc theo tòa nhà. Bỏ trống để xem tất cả")
            @RequestParam(required = false) Long buildingId
    ) {
        return ApiResponse.<DashboardRevenueResponse>builder()
                .code(200)
                .message("Get dashboard revenue successfully")
                .result(dashboardService.getRevenue(mode, year, buildingId))
                .build();
    }
}