package com.project.trosmart.controller;

import com.project.trosmart.dto.request.RoomRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.RoomType;
import com.project.trosmart.service.RoomService;
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
 * Quản lý phòng trọ. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
@Slf4j(topic = "ROOM-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý phòng",
        description = "API quản lý phòng trọ, chỉ dành cho quản trị viên (ADMIN)"
)
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    @Operation(
            summary = "Tạo phòng",
            description = "Tạo phòng mới trong một tòa nhà và thiết lập các tiện nghi của phòng"
    )
    public ApiResponse<RoomResponse> createRoom(
            @Valid @RequestBody RoomRequest request
    ) {
        log.info("Creating room: roomNumber={}, buildingId={}",
                request.getRoomNumber(), request.getBuildingId());

        RoomResponse room = roomService.createRoom(request);

        return ApiResponse.<RoomResponse>builder()
                .code(201)
                .message("Room created successfully")
                .result(room)
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Xem danh sách phòng",
            description = "Tìm kiếm, lọc theo tòa nhà, loại phòng, trạng thái và phân trang danh sách phòng"
    )
    public ApiResponse<PageResponse<RoomResponse>> getRooms(
            @Parameter(description = "Từ khóa tìm kiếm (mã phòng...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo ID tòa nhà. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) Long buildingId,

            @Parameter(description = "Lọc theo loại phòng. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) RoomType roomType,

            @Parameter(description = "Lọc theo trạng thái phòng. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) RoomStatus status,

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
        log.info(
                "Getting rooms: keyword={}, buildingId={}, roomType={}, status={}, page={}, size={}",
                keyword, buildingId, roomType, status, page, size
        );

        PageResponse<RoomResponse> rooms = roomService.getRooms(
                keyword,
                buildingId,
                roomType,
                status,
                page,
                size
        );

        return ApiResponse.<PageResponse<RoomResponse>>builder()
                .code(200)
                .message("Get rooms successfully")
                .result(rooms)
                .build();
    }

    @GetMapping("/dashboard")
    @Operation(
            summary = "Xem thống kê phòng",
            description = "Thống kê tổng số phòng, phòng đang thuê, phòng trống, phòng bảo trì "
                    + "và tỷ lệ lấp đầy. Có thể lọc theo tòa nhà"
    )
    public ApiResponse<RoomDashboardResponse> getRoomDashboard(
            @Parameter(description = "Lọc theo ID tòa nhà. Bỏ trống để thống kê toàn bộ")
            @RequestParam(required = false) Long buildingId
    ) {
        log.info("Getting room dashboard: buildingId={}", buildingId);

        RoomDashboardResponse dashboard =
                roomService.getRoomDashboard(buildingId);

        return ApiResponse.<RoomDashboardResponse>builder()
                .code(200)
                .message("Get room dashboard successfully")
                .result(dashboard)
                .build();
    }

    @GetMapping("/options")
    @Operation(
            summary = "Xem danh sách phòng để chọn",
            description = "Tìm phòng theo mã phòng, trả về ID phòng, mã phòng và tên tòa nhà, dùng cho các ô chọn"
    )
    public ApiResponse<List<RoomOptionResponse>> getRoomOptions(
            @Parameter(description = "Từ khóa tìm theo mã phòng. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword
    ) {
        log.info("Getting room options: keyword={}", keyword);

        List<RoomOptionResponse> rooms = roomService.getRoomOptions(keyword);

        return ApiResponse.<List<RoomOptionResponse>>builder()
                .code(200)
                .message("Get room options successfully")
                .result(rooms)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết phòng",
            description = "Lấy chi tiết đầy đủ của phòng: tiện nghi, ảnh, hợp đồng hiện tại, người ở, "
                    + "điện nước, hóa đơn và sự cố gần đây"
    )
    public ApiResponse<RoomDetailResponse> getRoomById(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long id
    ) {
        log.info("Getting room by id: {}", id);

        RoomDetailResponse room = roomService.getRoomById(id);

        return ApiResponse.<RoomDetailResponse>builder()
                .code(200)
                .message("Get room successfully")
                .result(room)
                .build();
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Cập nhật phòng",
            description = "Cập nhật thông tin phòng, tòa nhà và danh sách tiện nghi"
    )
    public ApiResponse<RoomResponse> updateRoom(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody RoomRequest request
    ) {
        log.info("Updating room: id={}", id);

        RoomResponse room = roomService.updateRoom(id, request);

        return ApiResponse.<RoomResponse>builder()
                .code(200)
                .message("Room updated successfully")
                .result(room)
                .build();
    }

    @PatchMapping("/{id}/maintenance")
    @Operation(
            summary = "Chuyển bảo trì / mở lại phòng",
            description = "enabled=true: chuyển phòng đang trống sang bảo trì. "
                    + "enabled=false: mở lại phòng đang bảo trì (về trống). "
                    + "Các trạng thái khác sẽ bị từ chối"
    )
    public ApiResponse<RoomResponse> updateRoomMaintenance(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long id,

            @Parameter(description = "true: chuyển sang bảo trì; false: mở lại phòng", required = true)
            @RequestParam boolean enabled
    ) {
        log.info("Updating room maintenance: id={}, enabled={}", id, enabled);

        return ApiResponse.<RoomResponse>builder()
                .code(200)
                .message(enabled ? "Room locked for maintenance" : "Room reopened")
                .result(roomService.updateRoomMaintenance(id, enabled))
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Xóa phòng",
            description = "Xóa mềm phòng (đánh dấu deleted = true). "
                    + "Không cho xóa khi phòng đang có hợp đồng hiệu lực, đang thuê hoặc đã được đặt"
    )
    public ApiResponse<Void> deleteRoom(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long id
    ) {
        log.info("Deleting room: id={}", id);

        roomService.deleteRoom(id);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Room deleted successfully")
                .build();
    }
}