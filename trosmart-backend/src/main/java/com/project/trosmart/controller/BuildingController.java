package com.project.trosmart.controller;

import com.project.trosmart.dto.request.BuildingRequest;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.BuildingOptionResponse;
import com.project.trosmart.dto.response.BuildingResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.service.BuildingService;
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
 * Quản lý tòa nhà. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 * (Danh sách tòa nhà cho website công khai nằm ở PublicController: GET /api/v1/public/buildings)
 */
@RestController
@RequestMapping("/api/v1/buildings")
@RequiredArgsConstructor
@Slf4j(topic = "BUILDING-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý tòa nhà",
        description = "API quản lý tòa nhà, chỉ dành cho quản trị viên (ADMIN)"
)
public class BuildingController {

    private final BuildingService buildingService;

    @PostMapping
    @Operation(
            summary = "Tạo tòa nhà",
            description = "Tạo mới một tòa nhà và thiết lập các tiện nghi chung"
    )
    public ApiResponse<BuildingResponse> createBuilding(
            @Valid @RequestBody BuildingRequest request
    ) {

        BuildingResponse building =
                buildingService.createBuilding(request);

        return ApiResponse.<BuildingResponse>builder()
                .code(201)
                .message("Building created successfully")
                .result(building)
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Xem danh sách tòa nhà",
            description = "Tìm kiếm theo từ khóa và phân trang danh sách tòa nhà"
    )
    public ApiResponse<PageResponse<BuildingResponse>> getBuildings(
            @Parameter(description = "Từ khóa tìm kiếm (tên, địa chỉ...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

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

        PageResponse<BuildingResponse> buildings =
                buildingService.getBuildings(
                        keyword,
                        page,
                        size
                );

        return ApiResponse.<PageResponse<BuildingResponse>>builder()
                .code(200)
                .message("Get buildings successfully")
                .result(buildings)
                .build();
    }

    @GetMapping("/options")
    @Operation(
            summary = "Xem danh sách tòa nhà để chọn",
            description = "Trả về các tòa nhà đang hoạt động, dùng cho ô chọn tòa nhà"
    )
    public ApiResponse<List<BuildingOptionResponse>> getBuildingOptions() {

        List<BuildingOptionResponse> buildings =
                buildingService.getBuildingOptions();

        return ApiResponse.<List<BuildingOptionResponse>>builder()
                .code(200)
                .message("Get building options successfully")
                .result(buildings)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết tòa nhà",
            description = "Lấy thông tin tòa nhà theo ID"
    )
    public ApiResponse<BuildingResponse> getBuildingById(
            @Parameter(description = "ID tòa nhà", example = "1")
            @PathVariable Long id
    ) {

        BuildingResponse building =
                buildingService.getBuildingById(id);

        return ApiResponse.<BuildingResponse>builder()
                .code(200)
                .message("Get building successfully")
                .result(building)
                .build();
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Cập nhật tòa nhà",
            description = "Cập nhật thông tin và tiện nghi của tòa nhà"
    )
    public ApiResponse<BuildingResponse> updateBuilding(
            @Parameter(description = "ID tòa nhà", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody BuildingRequest request
    ) {

        BuildingResponse building =
                buildingService.updateBuilding(id, request);

        return ApiResponse.<BuildingResponse>builder()
                .code(200)
                .message("Building updated successfully")
                .result(building)
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Xóa tòa nhà",
            description = "Xóa mềm tòa nhà theo ID"
    )
    public ApiResponse<Void> deleteBuilding(
            @Parameter(description = "ID tòa nhà", example = "1")
            @PathVariable Long id
    ) {

        buildingService.deleteBuilding(id);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Building deleted successfully")
                .build();
    }
}