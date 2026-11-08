package com.project.trosmart.controller;

import com.project.trosmart.dto.request.NotificationRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.NotificationStatus;
import com.project.trosmart.enums.NotificationTargetType;
import com.project.trosmart.enums.NotificationType;
import com.project.trosmart.service.NotificationService;
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
 * Quản lý thông báo gửi cho khách thuê. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Slf4j(topic = "NOTIFICATION-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý thông báo",
        description = "API soạn, hẹn giờ, gửi và theo dõi thông báo gửi cho khách thuê, "
                + "chỉ dành cho quản trị viên (ADMIN)"
)
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(
            summary = "Xem danh sách thông báo",
            description = "Lọc theo loại, trạng thái, đối tượng nhận; tìm theo tiêu đề; có phân trang"
    )
    public ApiResponse<PageResponse<NotificationResponse>> getNotifications(
            @Parameter(description = "Lọc theo loại thông báo. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) NotificationType type,

            @Parameter(description = "Lọc theo trạng thái thông báo (nháp, hẹn giờ, đã gửi...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) NotificationStatus status,

            @Parameter(description = "Lọc theo đối tượng nhận (tòa nhà, phòng, khách). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) NotificationTargetType targetType,

            @Parameter(description = "Từ khóa tìm theo tiêu đề. Bỏ trống để lấy tất cả")
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
        log.info(
                "Getting notifications: type={}, status={}, targetType={}, keyword={}, page={}, size={}",
                type, status, targetType, keyword, page, size
        );

        return ApiResponse.<PageResponse<NotificationResponse>>builder()
                .code(200)
                .message("Get notifications successfully")
                .result(notificationService.getNotifications(
                        type, status, targetType, keyword, page, size))
                .build();
    }

    @GetMapping("/dashboard")
    @Operation(
            summary = "Xem thống kê thông báo",
            description = "Trả về tổng số thông báo, số đã gửi, bản nháp và đã lên lịch cho các thẻ thống kê"
    )
    public ApiResponse<NotificationDashboardResponse> getNotificationDashboard() {
        return ApiResponse.<NotificationDashboardResponse>builder()
                .code(200)
                .message("Get notification dashboard successfully")
                .result(notificationService.getNotificationDashboard())
                .build();
    }

    @GetMapping("/target-options")
    @Operation(
            summary = "Xem gợi ý đối tượng nhận",
            description = "Trả về tối đa 20 gợi ý theo loại đối tượng: tòa nhà đang hoạt động (BUILDING), "
                    + "phòng đang có người ở (ROOM) hoặc khách đang thuê có tài khoản (TENANT). "
                    + "Có thể tìm theo từ khóa"
    )
    public ApiResponse<List<NotificationTargetOptionResponse>> getTargetOptions(
            @Parameter(description = "Loại đối tượng cần gợi ý", required = true)
            @RequestParam NotificationTargetType targetType,

            @Parameter(description = "Từ khóa tìm kiếm. Bỏ trống để lấy gợi ý mặc định")
            @RequestParam(required = false) String keyword
    ) {
        return ApiResponse.<List<NotificationTargetOptionResponse>>builder()
                .code(200)
                .message("Get target options successfully")
                .result(notificationService.getTargetOptions(targetType, keyword))
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết thông báo",
            description = "Lấy nội dung thông báo kèm số người nhận và số người đã đọc"
    )
    public ApiResponse<NotificationDetailResponse> getNotificationById(
            @Parameter(description = "ID thông báo", example = "1")
            @PathVariable Long id
    ) {
        return ApiResponse.<NotificationDetailResponse>builder()
                .code(200)
                .message("Get notification successfully")
                .result(notificationService.getNotificationById(id))
                .build();
    }

    @GetMapping("/{id}/recipients")
    @Operation(
            summary = "Xem danh sách người nhận",
            description = "Xem ai đã đọc, ai chưa đọc thông báo; có thể lọc theo trạng thái đã đọc, có phân trang"
    )
    public ApiResponse<PageResponse<NotificationRecipientResponse>> getRecipients(
            @Parameter(description = "ID thông báo", example = "1")
            @PathVariable Long id,

            @Parameter(description = "true: chỉ người đã đọc; false: chỉ người chưa đọc. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) Boolean isRead,

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
        return ApiResponse.<PageResponse<NotificationRecipientResponse>>builder()
                .code(200)
                .message("Get recipients successfully")
                .result(notificationService.getRecipients(id, isRead, page, size))
                .build();
    }

    @PostMapping
    @Operation(
            summary = "Soạn thông báo",
            description = "Tạo thông báo mới. Không có scheduledAt: lưu nháp. Có scheduledAt: hẹn giờ gửi"
    )
    public ApiResponse<NotificationDetailResponse> createNotification(
            @RequestBody @Valid NotificationRequest request
    ) {
        log.info("Creating notification: title={}, targetType={}", request.getTitle(), request.getTargetType());

        return ApiResponse.<NotificationDetailResponse>builder()
                .code(200)
                .message("Create notification successfully")
                .result(notificationService.createNotification(request))
                .build();
    }

    @PostMapping("/{id}/send")
    @Operation(
            summary = "Gửi thông báo ngay",
            description = "Gửi cho khách đang ở theo đối tượng nhận. Không có người nhận thì báo lỗi"
    )
    public ApiResponse<NotificationDetailResponse> sendNotification(
            @Parameter(description = "ID thông báo", example = "1")
            @PathVariable Long id
    ) {
        log.info("Sending notification id={}", id);

        return ApiResponse.<NotificationDetailResponse>builder()
                .code(200)
                .message("Send notification successfully")
                .result(notificationService.sendNotification(id))
                .build();
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Sửa thông báo",
            description = "Chỉ sửa được khi thông báo đang là nháp hoặc đang hẹn giờ"
    )
    public ApiResponse<NotificationDetailResponse> updateNotification(
            @Parameter(description = "ID thông báo", example = "1")
            @PathVariable Long id,

            @RequestBody @Valid NotificationRequest request
    ) {
        log.info("Updating notification id={}", id);

        return ApiResponse.<NotificationDetailResponse>builder()
                .code(200)
                .message("Update notification successfully")
                .result(notificationService.updateNotification(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Xóa thông báo",
            description = "Chỉ xóa được thông báo đang là nháp hoặc đang hẹn giờ"
    )
    public ApiResponse<Void> deleteNotification(
            @Parameter(description = "ID thông báo", example = "1")
            @PathVariable Long id
    ) {
        log.info("Deleting notification id={}", id);

        notificationService.deleteNotification(id);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Delete notification successfully")
                .build();
    }
}