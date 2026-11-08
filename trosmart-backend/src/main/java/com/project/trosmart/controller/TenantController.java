package com.project.trosmart.controller;

import com.project.trosmart.dto.request.TenantRequest;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.TenantContractHistoryResponse;
import com.project.trosmart.dto.response.TenantDashboardResponse;
import com.project.trosmart.dto.response.TenantOptionResponse;
import com.project.trosmart.dto.response.TenantResponse;
import com.project.trosmart.enums.TenantRentalStatus;
import com.project.trosmart.service.TenantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Quản lý khách thuê. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
@Slf4j(topic = "TENANT-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý khách thuê",
        description = "API quản lý hồ sơ khách thuê, chỉ dành cho quản trị viên (ADMIN)"
)
public class TenantController {

    private final TenantService tenantService;

    @PostMapping
    @Operation(
            summary = "Tạo khách thuê",
            description = "Tạo mới hồ sơ khách thuê"
    )
    public ApiResponse<TenantResponse> createTenant(
            @Valid @RequestBody TenantRequest request
    ) {
        TenantResponse response = tenantService.createTenant(request);

        return ApiResponse.<TenantResponse>builder()
                .code(200)
                .message("Tenant created successfully")
                .result(response)
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Xem danh sách khách thuê",
            description = "Tìm kiếm, lọc theo tình trạng thuê và phân trang danh sách khách thuê"
    )
    public ApiResponse<PageResponse<TenantResponse>> getTenants(
            @Parameter(description = "Từ khóa tìm kiếm (họ tên, số điện thoại...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo tình trạng thuê. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) TenantRentalStatus rentalStatus,

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
        PageResponse<TenantResponse> response =
                tenantService.searchTenants(keyword, rentalStatus, page, size);

        return ApiResponse.<PageResponse<TenantResponse>>builder()
                .code(200)
                .message("Get tenants successfully")
                .result(response)
                .build();
    }

    @GetMapping("/dashboard")
    @Operation(
            summary = "Xem thống kê khách thuê",
            description = "Trả về số lượng khách thuê theo tình trạng thuê và tình trạng tài khoản"
    )
    public ApiResponse<TenantDashboardResponse> getTenantDashboard() {
        TenantDashboardResponse response =
                tenantService.getTenantDashboard();

        return ApiResponse.<TenantDashboardResponse>builder()
                .code(200)
                .message("Get tenant dashboard successfully")
                .result(response)
                .build();
    }

    @GetMapping("/options")
    @Operation(
            summary = "Xem danh sách khách thuê để chọn",
            description = "Trả về danh sách rút gọn khách thuê dùng cho ô chọn, ví dụ khi lập hợp đồng"
    )
    public ApiResponse<List<TenantOptionResponse>> getTenantOptions(
            @Parameter(description = "Từ khóa tìm kiếm. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword
    ) {
        List<TenantOptionResponse> response =
                tenantService.getTenantOptions(keyword);

        return ApiResponse.<List<TenantOptionResponse>>builder()
                .code(200)
                .message("Get tenant options successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết khách thuê",
            description = "Lấy thông tin hồ sơ khách thuê theo ID"
    )
    public ApiResponse<TenantResponse> getTenantById(
            @Parameter(description = "ID khách thuê", example = "1")
            @PathVariable Long id
    ) {
        TenantResponse response = tenantService.getTenantById(id);

        return ApiResponse.<TenantResponse>builder()
                .code(200)
                .message("Get tenant successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{id}/contracts")
    @Operation(
            summary = "Xem lịch sử thuê của khách",
            description = "Trả về các hợp đồng có khách tham gia, kể cả đã kết thúc, mới nhất trước"
    )
    public ApiResponse<List<TenantContractHistoryResponse>> getTenantContracts(
            @Parameter(description = "ID khách thuê", example = "1")
            @PathVariable Long id
    ) {
        List<TenantContractHistoryResponse> response =
                tenantService.getTenantContracts(id);

        return ApiResponse.<List<TenantContractHistoryResponse>>builder()
                .code(200)
                .message("Get tenant contracts successfully")
                .result(response)
                .build();
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Cập nhật khách thuê",
            description = "Cập nhật thông tin hồ sơ khách thuê"
    )
    public ApiResponse<TenantResponse> updateTenant(
            @Parameter(description = "ID khách thuê", example = "1")
            @PathVariable Long id,
            @Valid @ModelAttribute TenantRequest request
    ) {
        TenantResponse response =
                tenantService.updateTenant(id, request);

        return ApiResponse.<TenantResponse>builder()
                .code(200)
                .message("Tenant updated successfully")
                .result(response)
                .build();
    }

    @PatchMapping(
            value = "/{id}/identity-images",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Operation(
            summary = "Cập nhật ảnh CCCD",
            description = "Cập nhật ảnh mặt trước và/hoặc mặt sau CCCD của khách thuê. "
                    + "Mặt nào không gửi thì giữ nguyên ảnh cũ"
    )
    public ApiResponse<TenantResponse> updateIdentityImages(
            @Parameter(description = "ID khách thuê", example = "1")
            @PathVariable Long id,

            @Parameter(description = "Ảnh mặt trước CCCD")
            @RequestParam(required = false) MultipartFile frontImage,

            @Parameter(description = "Ảnh mặt sau CCCD")
            @RequestParam(required = false) MultipartFile backImage
    ) {
        TenantResponse response = tenantService.updateIdentityImages(
                id,
                frontImage,
                backImage
        );

        return ApiResponse.<TenantResponse>builder()
                .code(200)
                .message("Cập nhật ảnh CCCD thành công")
                .result(response)
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Xóa khách thuê",
            description = "Xóa mềm hồ sơ khách thuê. Không cho xóa khi khách đang có hợp đồng hiệu lực"
    )
    public ApiResponse<Void> deleteTenant(
            @Parameter(description = "ID khách thuê", example = "1")
            @PathVariable Long id
    ) {
        tenantService.deleteTenant(id);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Tenant deleted successfully")
                .build();
    }
}