package com.project.trosmart.controller;

import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.RoomImageResponse;
import com.project.trosmart.service.RoomImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotEmpty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Quản lý hình ảnh phòng. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/rooms/{roomId}/images")
@RequiredArgsConstructor
@Slf4j(topic = "ROOM-IMAGE-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý ảnh phòng",
        description = "API quản lý hình ảnh của phòng trọ, chỉ dành cho quản trị viên (ADMIN)"
)
public class RoomImageController {

    private final RoomImageService roomImageService;

    @GetMapping
    @Operation(
            summary = "Xem danh sách ảnh phòng",
            description = "Lấy toàn bộ ảnh của một phòng"
    )
    public ApiResponse<List<RoomImageResponse>> getRoomImages(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long roomId
    ) {
        log.info("Getting images for room: {}", roomId);

        List<RoomImageResponse> images =
                roomImageService.getRoomImages(roomId);

        return ApiResponse.<List<RoomImageResponse>>builder()
                .code(200)
                .message("Lấy danh sách ảnh phòng thành công")
                .result(images)
                .build();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Tải ảnh phòng lên",
            description = "Tải lên một hoặc nhiều ảnh cho phòng (gửi dạng multipart/form-data, "
                    + "trường files). Mỗi phòng có tối đa 9 ảnh"
    )
    public ApiResponse<List<RoomImageResponse>> uploadRoomImages(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long roomId,

            @Parameter(description = "Danh sách file ảnh cần tải lên, không được rỗng")
            @RequestPart("files") @NotEmpty List<MultipartFile> files
    ) {
        log.info(
                "Uploading {} images for room: {}",
                files.size(),
                roomId
        );

        List<RoomImageResponse> images =
                roomImageService.uploadImages(roomId, files);

        return ApiResponse.<List<RoomImageResponse>>builder()
                .code(201)
                .message("Upload ảnh phòng thành công")
                .result(images)
                .build();
    }

    @PatchMapping("/{imageId}/thumbnail")
    @Operation(
            summary = "Chọn ảnh đại diện",
            description = "Đặt ảnh được chọn làm ảnh đại diện của phòng"
    )
    public ApiResponse<RoomImageResponse> setThumbnail(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long roomId,

            @Parameter(description = "ID ảnh cần đặt làm ảnh đại diện", example = "1")
            @PathVariable Long imageId
    ) {
        log.info(
                "Setting thumbnail image {} for room {}",
                imageId,
                roomId
        );

        RoomImageResponse image =
                roomImageService.setThumbnail(roomId, imageId);

        return ApiResponse.<RoomImageResponse>builder()
                .code(200)
                .message("Cập nhật ảnh đại diện thành công")
                .result(image)
                .build();
    }

    @DeleteMapping("/{imageId}")
    @Operation(
            summary = "Xóa ảnh phòng",
            description = "Xóa ảnh khỏi phòng và khỏi Cloudinary"
    )
    public ApiResponse<Void> deleteRoomImage(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long roomId,

            @Parameter(description = "ID ảnh cần xóa", example = "1")
            @PathVariable Long imageId
    ) {
        log.info(
                "Deleting image {} from room {}",
                imageId,
                roomId
        );

        roomImageService.deleteImage(roomId, imageId);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Xóa ảnh phòng thành công")
                .build();
    }
}