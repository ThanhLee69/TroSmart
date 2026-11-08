package com.project.trosmart.controller;

import com.project.trosmart.dto.request.ContactRequest;
import com.project.trosmart.dto.request.PublicRoomSearchRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.service.BuildingService;
import com.project.trosmart.service.PublicService;
import com.project.trosmart.util.ClientIpResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API công khai cho website, không yêu cầu đăng nhập
 * (đường dẫn /api/v1/public/** được mở trong cấu hình bảo mật).
 */
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "API công khai",
        description = "API dành cho website TroSmart, không cần đăng nhập"
)
public class PublicController {

    private final ClientIpResolver clientIpResolver;
    private final BuildingService buildingService;
    private final PublicService publicService;

    // ---------- Tòa nhà ----------

    @GetMapping("/buildings")
    @Operation(
            summary = "Xem danh sách tòa nhà",
            description = "Lấy toàn bộ tòa nhà (kèm tọa độ nếu có) để hiển thị trên website, "
                    + "ví dụ bản đồ ở trang Liên hệ"
    )
    public ApiResponse<List<BuildingResponse>> getPublicBuildings() {
        List<BuildingResponse> buildings =
                buildingService.getAllBuildings();

        return ApiResponse.<List<BuildingResponse>>builder()
                .code(200)
                .message("Get public buildings successfully")
                .result(buildings)
                .build();
    }

    // ---------- Phòng ----------

    @GetMapping("/rooms")
    @Operation(
            summary = "Xem danh sách phòng trống",
            description = "Danh sách phòng còn trống, mới nhất trước, có phân trang. "
                    + "Dùng cho trang chủ"
    )
    public ApiResponse<PageResponse<PublicRoomResponse>> getPublicRooms(
            @Parameter(description = "Số trang, bắt đầu từ 1", example = "1")
            @RequestParam(defaultValue = "1")
            @Min(value = 1, message = "Trang phải lớn hơn hoặc bằng 1")
            int page,

            @Parameter(description = "Số bản ghi mỗi trang, từ 1 đến 50", example = "12")
            @RequestParam(defaultValue = "12")
            @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
            @Max(value = 50, message = "Kích thước trang tối đa là 50")
            int size
    ) {
        PageResponse<PublicRoomResponse> rooms =
                publicService.getAvailableRooms(page, size);

        return ApiResponse.<PageResponse<PublicRoomResponse>>builder()
                .code(200)
                .message("Get public rooms successfully")
                .result(rooms)
                .build();
    }

    @GetMapping("/rooms/search")
    @Operation(
            summary = "Tìm phòng trống theo bộ lọc",
            description = "Lọc theo từ khóa, loại phòng, giá, diện tích, sức chứa, tầng, tiện nghi, "
                    + "khu vực hoặc vị trí và bán kính (km). Có sắp xếp và phân trang. "
                    + "Dùng cho trang Tìm phòng"
    )
    public ApiResponse<PageResponse<PublicRoomResponse>> searchPublicRooms(
            @Valid @ModelAttribute PublicRoomSearchRequest request
    ) {
        return ApiResponse.<PageResponse<PublicRoomResponse>>builder()
                .code(200)
                .message("Search public rooms successfully")
                .result(publicService.searchAvailableRooms(request))
                .build();
    }

    @GetMapping("/rooms/{id}")
    @Operation(
            summary = "Xem chi tiết phòng trống",
            description = "Chi tiết một phòng còn trống: ảnh, tiện nghi và thông tin tòa nhà"
    )
    public ApiResponse<PublicRoomDetailResponse> getPublicRoomDetail(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long id
    ) {
        return ApiResponse.<PublicRoomDetailResponse>builder()
                .code(200)
                .message("Get public room detail successfully")
                .result(publicService.getAvailableRoomDetail(id))
                .build();
    }

    @GetMapping("/rooms/{id}/similar")
    @Operation(
            summary = "Xem danh sách phòng tương tự",
            description = "Phòng còn trống gần giống phòng đang xem về giá, vị trí, diện tích, "
                    + "tiện nghi và loại phòng, xếp theo độ giống giảm dần. "
                    + "Dùng cho mục Phòng tương tự ở trang chi tiết phòng"
    )
    public ApiResponse<List<PublicRoomResponse>> getSimilarRooms(
            @Parameter(description = "ID phòng đang xem", example = "1")
            @PathVariable Long id,

            @Parameter(description = "Số phòng tương tự tối đa, từ 1 đến 12", example = "4")
            @RequestParam(defaultValue = "4")
            @Min(value = 1, message = "Số phòng tối thiểu là 1")
            @Max(value = 12, message = "Số phòng tối đa là 12")
            int limit
    ) {
        List<PublicRoomResponse> rooms = publicService.getSimilarRooms(id, limit);

        return ApiResponse.<List<PublicRoomResponse>>builder()
                .code(200)
                .message("Get similar rooms successfully")
                .result(rooms)
                .build();
    }

    @GetMapping("/amenities")
    @Operation(
            summary = "Xem danh sách tiện nghi",
            description = "Tên các tiện nghi dùng làm bộ lọc trên trang Tìm phòng"
    )
    public ApiResponse<List<String>> getPublicAmenities() {
        return ApiResponse.<List<String>>builder()
                .code(200)
                .message("Get public amenities successfully")
                .result(publicService.getAmenityNames())
                .build();
    }

    // ---------- Liên hệ ----------

    @PostMapping("/contacts")
    @Operation(
            summary = "Gửi yêu cầu liên hệ",
            description = "Khách gửi yêu cầu liên hệ, không cần đăng nhập. "
                    + "Có giới hạn tần suất theo địa chỉ IP và các lớp chống spam"
    )
    public ApiResponse<Void> createContact(
            @Valid @RequestBody ContactRequest request,
            @Parameter(hidden = true) HttpServletRequest httpRequest
    ) {
        publicService.createContact(request, clientIpResolver.resolve(httpRequest));

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Đã ghi nhận yêu cầu liên hệ")
                .build();
    }
}