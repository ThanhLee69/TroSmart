package com.project.trosmart.controller;

import com.project.trosmart.dto.request.ServiceItemRequest;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.ServiceItemResponse;
import com.project.trosmart.enums.BillingType;
import com.project.trosmart.service.ServiceItemService;
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
 * Quản lý dịch vụ. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/service-items")
@RequiredArgsConstructor
@Slf4j(topic = "SERVICE-ITEM-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý dịch vụ",
        description = "API quản lý danh mục dịch vụ (điện, nước, internet...), chỉ dành cho quản trị viên (ADMIN)"
)
public class ServiceItemController {

    private final ServiceItemService serviceItemService;

    @PostMapping
    @Operation(
            summary = "Tạo dịch vụ",
            description = "Tạo mới một dịch vụ trong hệ thống"
    )
    public ApiResponse<ServiceItemResponse> createServiceItem(
            @Valid @RequestBody ServiceItemRequest request
    ) {
        ServiceItemResponse response =
                serviceItemService.createServiceItem(request);

        return ApiResponse.<ServiceItemResponse>builder()
                .code(201)
                .message("Service item created successfully")
                .result(response)
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Xem danh sách dịch vụ",
            description = "Tìm kiếm, lọc theo loại tính phí và phân trang danh sách dịch vụ"
    )
    public ApiResponse<PageResponse<ServiceItemResponse>> getServiceItems(
            @Parameter(description = "Từ khóa tìm kiếm theo tên dịch vụ. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo loại tính phí. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) BillingType billingType,

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
        PageResponse<ServiceItemResponse> response =
                serviceItemService.getServiceItems(
                        keyword,
                        billingType,
                        page,
                        size
                );

        return ApiResponse.<PageResponse<ServiceItemResponse>>builder()
                .code(200)
                .message("Get service items successfully")
                .result(response)
                .build();
    }

    @GetMapping("/options")
    @Operation(
            summary = "Xem danh sách dịch vụ để chọn",
            description = "Trả về danh sách dịch vụ không phân trang, dùng cho các ô chọn, hỗ trợ tìm theo tên"
    )
    public ApiResponse<List<ServiceItemResponse>> getServiceItemOptions(
            @Parameter(description = "Từ khóa tìm kiếm theo tên dịch vụ. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword
    ) {
        List<ServiceItemResponse> response =
                serviceItemService.getServiceItemOptions(keyword);

        return ApiResponse.<List<ServiceItemResponse>>builder()
                .code(200)
                .message("Get service item options successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết dịch vụ",
            description = "Lấy thông tin dịch vụ theo ID"
    )
    public ApiResponse<ServiceItemResponse> getServiceItemById(
            @Parameter(description = "ID dịch vụ", example = "1")
            @PathVariable Long id
    ) {
        ServiceItemResponse response =
                serviceItemService.getServiceItemById(id);

        return ApiResponse.<ServiceItemResponse>builder()
                .code(200)
                .message("Get service item successfully")
                .result(response)
                .build();
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Cập nhật dịch vụ",
            description = "Cập nhật thông tin dịch vụ theo ID"
    )
    public ApiResponse<ServiceItemResponse> updateServiceItem(
            @Parameter(description = "ID dịch vụ", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody ServiceItemRequest request
    ) {
        ServiceItemResponse response =
                serviceItemService.updateServiceItem(id, request);

        return ApiResponse.<ServiceItemResponse>builder()
                .code(200)
                .message("Service item updated successfully")
                .result(response)
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Xóa dịch vụ",
            description = "Xóa mềm dịch vụ theo ID"
    )
    public ApiResponse<Void> deleteServiceItem(
            @Parameter(description = "ID dịch vụ", example = "1")
            @PathVariable Long id
    ) {
        serviceItemService.deleteServiceItem(id);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Service item deleted successfully")
                .build();
    }
}