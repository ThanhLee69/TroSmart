package com.project.trosmart.controller;

import com.project.trosmart.dto.request.AmenityRequest;
import com.project.trosmart.dto.response.AmenityResponse;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.AmenityScope;
import com.project.trosmart.service.AmenityService;
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
 * Quản lý tiện nghi. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 * (Danh sách tiện nghi cho bộ lọc website nằm ở PublicController: GET /api/v1/public/amenities)
 */
@RestController
@RequestMapping("/api/v1/amenities")
@RequiredArgsConstructor
@Slf4j(topic = "AMENITY-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý tiện nghi",
        description = "API quản lý danh mục tiện nghi của tòa nhà và phòng, chỉ dành cho quản trị viên (ADMIN)"
)
public class AmenityController {

    private final AmenityService amenityService;

    @PostMapping
    @Operation(
            summary = "Tạo tiện nghi",
            description = "Tạo mới một tiện nghi trong hệ thống"
    )
    public ApiResponse<AmenityResponse> createAmenity(
            @Valid @RequestBody AmenityRequest request
    ) {
        AmenityResponse amenity = amenityService.createAmenity(request);

        return ApiResponse.<AmenityResponse>builder()
                .code(201)
                .message("Amenity created successfully")
                .result(amenity)
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Xem danh sách tiện nghi",
            description = "Tìm kiếm, lọc theo phạm vi áp dụng và phân trang danh sách tiện nghi"
    )
    public ApiResponse<PageResponse<AmenityResponse>> getAmenities(
            @Parameter(description = "Từ khóa tìm theo tên tiện nghi. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo phạm vi áp dụng (BUILDING, ROOM, BOTH). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) AmenityScope scope,

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
        PageResponse<AmenityResponse> response =
                amenityService.getAmenities(keyword, scope, page, size);

        return ApiResponse.<PageResponse<AmenityResponse>>builder()
                .code(200)
                .message("Get amenities successfully")
                .result(response)
                .build();
    }

    @GetMapping("/building")
    @Operation(
            summary = "Xem tiện nghi dùng cho tòa nhà",
            description = "Trả về các tiện nghi có phạm vi BUILDING và BOTH, dùng cho form tòa nhà"
    )
    public ApiResponse<List<AmenityResponse>> getBuildingAmenities() {
        List<AmenityResponse> amenities =
                amenityService.getBuildingAmenities();

        return ApiResponse.<List<AmenityResponse>>builder()
                .code(200)
                .message("Get building amenities successfully")
                .result(amenities)
                .build();
    }

    @GetMapping("/room")
    @Operation(
            summary = "Xem tiện nghi dùng cho phòng",
            description = "Trả về các tiện nghi có phạm vi ROOM và BOTH, dùng cho form phòng"
    )
    public ApiResponse<List<AmenityResponse>> getRoomAmenities() {
        List<AmenityResponse> amenities =
                amenityService.getRoomAmenities();

        return ApiResponse.<List<AmenityResponse>>builder()
                .code(200)
                .message("Get room amenities successfully")
                .result(amenities)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết tiện nghi",
            description = "Lấy thông tin tiện nghi theo ID"
    )
    public ApiResponse<AmenityResponse> getAmenityById(
            @Parameter(description = "ID tiện nghi", example = "1")
            @PathVariable Long id
    ) {
        AmenityResponse response = amenityService.getAmenityById(id);

        return ApiResponse.<AmenityResponse>builder()
                .code(200)
                .message("Get amenity successfully")
                .result(response)
                .build();
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Cập nhật tiện nghi",
            description = "Cập nhật thông tin tiện nghi theo ID"
    )
    public ApiResponse<AmenityResponse> updateAmenity(
            @Parameter(description = "ID tiện nghi", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody AmenityRequest request
    ) {
        AmenityResponse response =
                amenityService.updateAmenity(id, request);

        return ApiResponse.<AmenityResponse>builder()
                .code(200)
                .message("Amenity updated successfully")
                .result(response)
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Xóa tiện nghi",
            description = "Xóa mềm tiện nghi theo ID"
    )
    public ApiResponse<Void> deleteAmenity(
            @Parameter(description = "ID tiện nghi", example = "1")
            @PathVariable Long id
    ) {
        amenityService.deleteAmenity(id);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Amenity deleted successfully")
                .build();
    }
}