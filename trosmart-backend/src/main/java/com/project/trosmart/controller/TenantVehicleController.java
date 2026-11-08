package com.project.trosmart.controller;

import com.project.trosmart.dto.request.TenantVehicleRequest;
import com.project.trosmart.dto.response.TenantOptionResponse;
import com.project.trosmart.dto.response.TenantVehicleResponse;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.VehicleType;
import com.project.trosmart.service.TenantVehicleService;

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

import java.util.List;

/**
 * Quản lý phương tiện của khách thuê. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
@Slf4j(topic = "TENANT-VEHICLE-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý phương tiện",
        description = "API quản lý phương tiện của khách thuê, chỉ dành cho quản trị viên (ADMIN)"
)
public class TenantVehicleController {

    private final TenantVehicleService tenantVehicleService;

    @PostMapping
    @Operation(
            summary = "Thêm phương tiện",
            description = "Đăng ký phương tiện mới cho một khách thuê"
    )
    public ApiResponse<TenantVehicleResponse> createVehicle(
            @Valid @RequestBody TenantVehicleRequest request
    ) {
        TenantVehicleResponse response =
                tenantVehicleService.createVehicle(request);

        return ApiResponse.<TenantVehicleResponse>builder()
                .code(201)
                .message("Tenant vehicle created successfully")
                .result(response)
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Xem danh sách phương tiện",
            description = "Tìm kiếm, lọc theo khách thuê và loại phương tiện, có phân trang"
    )
    public ApiResponse<PageResponse<TenantVehicleResponse>> getVehicles(
            @Parameter(description = "Lọc theo ID khách thuê. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) Long tenantId,

            @Parameter(description = "Từ khóa tìm kiếm (biển số, tên khách...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo loại phương tiện. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) VehicleType vehicleType,

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
        PageResponse<TenantVehicleResponse> response =
                tenantVehicleService.getVehicles(
                        tenantId, keyword, vehicleType, page, size
                );

        return ApiResponse.<PageResponse<TenantVehicleResponse>>builder()
                .code(200)
                .message("Get tenant vehicles successfully")
                .result(response)
                .build();
    }

    @GetMapping("/available-tenants")
    @Operation(
            summary = "Xem danh sách khách thuê để đăng ký phương tiện",
            description = "Trả về danh sách rút gọn khách thuê dùng cho ô chọn khi thêm phương tiện"
    )
    public ApiResponse<List<TenantOptionResponse>> getAvailableTenants(
            @Parameter(description = "Từ khóa tìm kiếm. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword
    ) {
        List<TenantOptionResponse> response =
                tenantVehicleService.getAvailableTenants(keyword);

        return ApiResponse.<List<TenantOptionResponse>>builder()
                .code(200)
                .message("Get available tenants successfully")
                .result(response)
                .build();
    }

    @GetMapping("/tenant/{tenantId}")
    @Operation(
            summary = "Xem phương tiện theo khách thuê",
            description = "Trả về toàn bộ phương tiện đã đăng ký của một khách thuê, không phân trang"
    )
    public ApiResponse<List<TenantVehicleResponse>> getVehiclesByTenantId(
            @Parameter(description = "ID khách thuê", example = "1")
            @PathVariable Long tenantId
    ) {
        List<TenantVehicleResponse> response =
                tenantVehicleService.getVehiclesByTenantId(tenantId);

        return ApiResponse.<List<TenantVehicleResponse>>builder()
                .code(200)
                .message("Get tenant vehicles successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{vehicleId}")
    @Operation(
            summary = "Xem chi tiết phương tiện",
            description = "Lấy thông tin phương tiện theo ID"
    )
    public ApiResponse<TenantVehicleResponse> getVehicleById(
            @Parameter(description = "ID phương tiện", example = "1")
            @PathVariable Long vehicleId
    ) {
        TenantVehicleResponse response =
                tenantVehicleService.getVehicleById(vehicleId);

        return ApiResponse.<TenantVehicleResponse>builder()
                .code(200)
                .message("Get tenant vehicle successfully")
                .result(response)
                .build();
    }

    @PutMapping("/{vehicleId}")
    @Operation(
            summary = "Cập nhật phương tiện",
            description = "Cập nhật thông tin phương tiện theo ID"
    )
    public ApiResponse<TenantVehicleResponse> updateVehicle(
            @Parameter(description = "ID phương tiện", example = "1")
            @PathVariable Long vehicleId,
            @Valid @RequestBody TenantVehicleRequest request
    ) {
        TenantVehicleResponse response =
                tenantVehicleService.updateVehicle(vehicleId, request);

        return ApiResponse.<TenantVehicleResponse>builder()
                .code(200)
                .message("Tenant vehicle updated successfully")
                .result(response)
                .build();
    }

    @DeleteMapping("/{vehicleId}")
    @Operation(
            summary = "Xóa phương tiện",
            description = "Xóa phương tiện của khách thuê theo ID"
    )
    public ApiResponse<Void> deleteVehicle(
            @Parameter(description = "ID phương tiện", example = "1")
            @PathVariable Long vehicleId
    ) {
        tenantVehicleService.deleteVehicle(vehicleId);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Tenant vehicle deleted successfully")
                .build();
    }
}