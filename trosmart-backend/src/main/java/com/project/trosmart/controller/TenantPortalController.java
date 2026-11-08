package com.project.trosmart.controller;

import com.project.trosmart.dto.request.ChangeMyPasswordRequest;
import com.project.trosmart.dto.request.IssueRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.NotificationType;
import com.project.trosmart.service.TenantPortalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Cổng khách thuê. Phân quyền áp dụng chung cho cả controller:
 * chỉ tài khoản có vai trò TENANT được gọi, và mọi API chỉ trả dữ liệu của chính người đang đăng nhập.
 */
@RestController
@RequestMapping("/api/v1/tenant")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('TENANT')")
@Tag(
        name = "Cổng khách thuê",
        description = "API dành cho khách thuê đang đăng nhập (vai trò TENANT). "
                + "Dữ liệu trả về luôn thuộc về chính khách đó, không truy cập được dữ liệu của người khác"
)
public class TenantPortalController {

    private final TenantPortalService tenantPortalService;

    // ---------- Tổng quan, hợp đồng, xe ----------

    @GetMapping("/dashboard")
    @Operation(
            summary = "Xem tổng quan",
            description = "Trả về phòng đang thuê, số tiền còn phải đóng, hóa đơn gần hạn nhất, "
                    + "số yêu cầu sửa chữa đang mở, số thông báo chưa đọc và số ngày còn lại của hợp đồng"
    )
    public ApiResponse<MyTenantDashboardResponse> getDashboard() {
        MyTenantDashboardResponse response = tenantPortalService.getDashboard();

        return ApiResponse.<MyTenantDashboardResponse>builder()
                .code(200)
                .message("Get dashboard successfully")
                .result(response)
                .build();
    }

    @GetMapping("/contract")
    @Operation(
            summary = "Xem hợp đồng đang hiệu lực",
            description = "Trả về hợp đồng đang hiệu lực kèm phòng, người ở cùng và dịch vụ áp dụng. "
                    + "Khách chưa có hợp đồng đang hiệu lực sẽ nhận lỗi không tìm thấy hợp đồng"
    )
    public ApiResponse<MyContractResponse> getMyContract() {
        MyContractResponse response = tenantPortalService.getMyContract();

        return ApiResponse.<MyContractResponse>builder()
                .code(200)
                .message("Get contract successfully")
                .result(response)
                .build();
    }

    @GetMapping("/vehicles")
    @Operation(
            summary = "Xem danh sách xe đã đăng ký",
            description = "Trả về các phương tiện đã đăng ký của khách thuê đang đăng nhập"
    )
    public ApiResponse<List<MyVehicleResponse>> getMyVehicles() {
        List<MyVehicleResponse> response = tenantPortalService.getMyVehicles();

        return ApiResponse.<List<MyVehicleResponse>>builder()
                .code(200)
                .message("Get vehicles successfully")
                .result(response)
                .build();
    }

    // ---------- Hóa đơn ----------

    @GetMapping("/invoices")
    @Operation(
            summary = "Xem danh sách hóa đơn",
            description = "Lấy hóa đơn của khách thuê đang đăng nhập, mới nhất trước, có phân trang. "
                    + "Có thể lọc theo nhiều trạng thái cùng lúc, không chọn trạng thái thì lấy tất cả"
    )
    public ApiResponse<PageResponse<MyInvoiceResponse>> getMyInvoices(
            @Parameter(description = "Số trang, bắt đầu từ 1", example = "1")
            @RequestParam(defaultValue = "1")
            @Min(value = 1, message = "Trang phải lớn hơn hoặc bằng 1")
            int page,

            @Parameter(description = "Số bản ghi mỗi trang, từ 1 đến 100", example = "20")
            @RequestParam(defaultValue = "20")
            @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
            @Max(value = 100, message = "Kích thước trang tối đa là 100")
            int size,

            @Parameter(description = "Lọc theo trạng thái hóa đơn, truyền nhiều giá trị cách nhau bằng dấu phẩy "
                    + "(ví dụ UNPAID,PARTIALLY_PAID,OVERDUE). Bỏ trống để lấy tất cả")
            @RequestParam(required = false)
            List<InvoiceStatus> statuses
    ) {
        PageResponse<MyInvoiceResponse> response =
                tenantPortalService.getMyInvoices(page, size, statuses);

        return ApiResponse.<PageResponse<MyInvoiceResponse>>builder()
                .code(200)
                .message("Get invoices successfully")
                .result(response)
                .build();
    }

    @GetMapping("/invoices/summary")
    @Operation(
            summary = "Xem số liệu tóm tắt hóa đơn",
            description = "Trả về tổng số hóa đơn, số hóa đơn còn phải đóng, số hóa đơn quá hạn, "
                    + "số hóa đơn đã đóng và tổng tiền còn nợ, dùng cho các tab lọc và khối tổng nợ"
    )
    public ApiResponse<MyInvoiceSummaryResponse> getMyInvoiceSummary() {
        MyInvoiceSummaryResponse response = tenantPortalService.getMyInvoiceSummary();

        return ApiResponse.<MyInvoiceSummaryResponse>builder()
                .code(200)
                .message("Get invoice summary successfully")
                .result(response)
                .build();
    }

    @GetMapping("/invoices/{id}")
    @Operation(
            summary = "Xem chi tiết hóa đơn",
            description = "Trả về chi tiết hóa đơn kèm các dòng tiền và lịch sử thanh toán. "
                    + "Hóa đơn không thuộc về khách thuê đang đăng nhập sẽ trả về không tìm thấy"
    )
    public ApiResponse<MyInvoiceDetailResponse> getMyInvoiceDetail(
            @Parameter(description = "ID hóa đơn", example = "1")
            @PathVariable Long id
    ) {
        MyInvoiceDetailResponse response = tenantPortalService.getMyInvoiceDetail(id);

        return ApiResponse.<MyInvoiceDetailResponse>builder()
                .code(200)
                .message("Get invoice successfully")
                .result(response)
                .build();
    }

    // ---------- Yêu cầu sửa chữa ----------

    @GetMapping("/issues")
    @Operation(
            summary = "Xem danh sách yêu cầu sửa chữa",
            description = "Lấy các yêu cầu sửa chữa do khách thuê đang đăng nhập gửi, có phân trang"
    )
    public ApiResponse<PageResponse<MyIssueResponse>> getMyIssues(
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
        PageResponse<MyIssueResponse> response =
                tenantPortalService.getMyIssues(page, size);

        return ApiResponse.<PageResponse<MyIssueResponse>>builder()
                .code(200)
                .message("Get issues successfully")
                .result(response)
                .build();
    }

    @PostMapping("/my-issues")
    @Operation(
            summary = "Gửi yêu cầu sửa chữa",
            description = "Khách thuê gửi yêu cầu sửa chữa cho phòng đang thuê"
    )
    public ApiResponse<MyIssueResponse> createMyIssue(
            @Valid @RequestBody IssueRequest request
    ) {
        MyIssueResponse response = tenantPortalService.createMyIssue(request);

        return ApiResponse.<MyIssueResponse>builder()
                .code(201)
                .message("Gửi yêu cầu sửa chữa thành công")
                .result(response)
                .build();
    }

    @PatchMapping("/issues/{id}/cancel")
    @Operation(
            summary = "Hủy yêu cầu sửa chữa",
            description = "Khách thuê chỉ được hủy khi chủ trọ chưa tiếp nhận yêu cầu"
    )
    public ApiResponse<MyIssueResponse> cancelMyIssue(
            @Parameter(description = "ID yêu cầu sửa chữa", example = "1")
            @PathVariable Long id
    ) {
        MyIssueResponse response = tenantPortalService.cancelMyIssue(id);

        return ApiResponse.<MyIssueResponse>builder()
                .code(200)
                .message("Issue cancelled successfully")
                .result(response)
                .build();
    }

    // ---------- Thông báo ----------

    @GetMapping("/notifications")
    @Operation(
            summary = "Xem danh sách thông báo",
            description = "Lấy thông báo chủ trọ gửi cho khách thuê đang đăng nhập, mới nhất trước, có phân trang. "
                    + "Có thể chỉ lấy thông báo chưa đọc và lọc theo loại thông báo"
    )
    public ApiResponse<PageResponse<MyNotificationResponse>> getMyNotifications(
            @Parameter(description = "Số trang, bắt đầu từ 1", example = "1")
            @RequestParam(defaultValue = "1")
            @Min(value = 1, message = "Trang phải lớn hơn hoặc bằng 1")
            int page,

            @Parameter(description = "Số bản ghi mỗi trang, từ 1 đến 100", example = "10")
            @RequestParam(defaultValue = "10")
            @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
            @Max(value = 100, message = "Kích thước trang tối đa là 100")
            int size,

            @Parameter(description = "true: chỉ lấy thông báo chưa đọc", example = "false")
            @RequestParam(defaultValue = "false")
            boolean unreadOnly,

            @Parameter(description = "Lọc theo loại thông báo, truyền nhiều giá trị cách nhau bằng dấu phẩy "
                    + "(ví dụ INVOICE_CREATED,PAYMENT_REMINDER). Bỏ trống để lấy tất cả")
            @RequestParam(required = false)
            List<NotificationType> types
    ) {
        PageResponse<MyNotificationResponse> response =
                tenantPortalService.getMyNotifications(page, size, unreadOnly, types);

        return ApiResponse.<PageResponse<MyNotificationResponse>>builder()
                .code(200)
                .message("Get notifications successfully")
                .result(response)
                .build();
    }

    @GetMapping("/notifications/unread-count")
    @Operation(
            summary = "Đếm thông báo chưa đọc",
            description = "Trả về số thông báo mà khách thuê đang đăng nhập chưa đọc"
    )
    public ApiResponse<Long> getMyUnreadNotificationCount() {
        long count = tenantPortalService.getMyUnreadNotificationCount();

        return ApiResponse.<Long>builder()
                .code(200)
                .message("Get unread notification count successfully")
                .result(count)
                .build();
    }

    @PatchMapping("/notifications/read-all")
    @Operation(
            summary = "Đánh dấu đã đọc tất cả thông báo",
            description = "Đánh dấu toàn bộ thông báo chưa đọc của khách thuê đang đăng nhập là đã đọc"
    )
    public ApiResponse<Void> markAllNotificationsRead() {
        tenantPortalService.markAllNotificationsRead();

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Marked all notifications as read successfully")
                .build();
    }

    @PatchMapping("/notifications/{id}/read")
    @Operation(
            summary = "Đánh dấu đã đọc một thông báo",
            description = "Đánh dấu một thông báo của khách thuê đang đăng nhập là đã đọc"
    )
    public ApiResponse<Void> markNotificationRead(
            @Parameter(description = "ID thông báo", example = "1")
            @PathVariable Long id
    ) {
        tenantPortalService.markNotificationRead(id);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Marked notification as read successfully")
                .build();
    }

    // ---------- Tài khoản ----------

    @GetMapping("/profile")
    @Operation(
            summary = "Xem thông tin cá nhân",
            description = "Chỉ xem, khách không tự sửa được. Số CCCD được che bớt, "
                    + "kèm phòng và tòa nhà của hợp đồng đang hiệu lực (null nếu chưa thuê)"
    )
    public ApiResponse<MyProfileResponse> getMyProfile() {
        MyProfileResponse response = tenantPortalService.getMyProfile();

        return ApiResponse.<MyProfileResponse>builder()
                .code(200)
                .message("Get profile successfully")
                .result(response)
                .build();
    }

    @PutMapping("/password")
    @Operation(
            summary = "Đổi mật khẩu",
            description = "Khách thuê đổi mật khẩu đăng nhập. Cần nhập đúng mật khẩu hiện tại, "
                    + "mật khẩu mới phải khác mật khẩu cũ và trùng với mật khẩu xác nhận"
    )
    public ApiResponse<Void> changeMyPassword(
            @Valid @RequestBody ChangeMyPasswordRequest request
    ) {
        tenantPortalService.changeMyPassword(request);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Password changed successfully")
                .build();
    }
}