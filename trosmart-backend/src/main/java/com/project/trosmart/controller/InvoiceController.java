package com.project.trosmart.controller;

import com.project.trosmart.dto.request.InvoiceCancelRequest;
import com.project.trosmart.dto.request.InvoicePreviewRequest;
import com.project.trosmart.dto.request.InvoiceRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Quản lý hóa đơn. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
@Slf4j(topic = "INVOICE-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý hóa đơn",
        description = "API lập, xem trước, xem và hủy hóa đơn theo kỳ, chỉ dành cho quản trị viên (ADMIN)"
)
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    @Operation(
            summary = "Xem danh sách hóa đơn",
            description = "Lọc theo tòa nhà, tháng, năm, trạng thái; tìm theo mã hóa đơn hoặc mã phòng; có phân trang"
    )
    public ApiResponse<PageResponse<InvoiceResponse>> getInvoices(
            @Parameter(description = "Lọc theo ID tòa nhà. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) Long buildingId,

            @Parameter(description = "Lọc theo tháng của kỳ, từ 1 đến 12. Bỏ trống để lấy tất cả", example = "11")
            @RequestParam(required = false)
            @Min(value = 1, message = "Tháng phải từ 1 đến 12")
            @Max(value = 12, message = "Tháng phải từ 1 đến 12")
            Integer billingMonth,

            @Parameter(description = "Lọc theo năm của kỳ. Bỏ trống để lấy tất cả", example = "2026")
            @RequestParam(required = false)
            @Min(value = 2000, message = "Năm không hợp lệ")
            @Max(value = 2100, message = "Năm không hợp lệ")
            Integer billingYear,

            @Parameter(description = "Lọc theo trạng thái hóa đơn. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) InvoiceStatus status,

            @Parameter(description = "Từ khóa tìm theo mã hóa đơn hoặc mã phòng. Bỏ trống để lấy tất cả")
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
                "Getting invoices: buildingId={}, month={}, year={}, status={}, keyword={}, page={}, size={}",
                buildingId, billingMonth, billingYear, status, keyword, page, size
        );

        PageResponse<InvoiceResponse> invoices = invoiceService.getInvoices(
                buildingId, billingMonth, billingYear, status, keyword, page, size);

        return ApiResponse.<PageResponse<InvoiceResponse>>builder()
                .code(200)
                .message("Get invoices successfully")
                .result(invoices)
                .build();
    }

    @GetMapping("/dashboard")
    @Operation(
            summary = "Xem thống kê hóa đơn của kỳ",
            description = "Trả về tổng tiền, đã thu, còn nợ, số hóa đơn và số hóa đơn quá hạn của một kỳ. "
                    + "Có thể lọc theo tòa nhà"
    )
    public ApiResponse<InvoiceDashboardResponse> getInvoiceDashboard(
            @Parameter(description = "Lọc theo ID tòa nhà. Bỏ trống để thống kê toàn bộ")
            @RequestParam(required = false) Long buildingId,

            @Parameter(description = "Tháng của kỳ, từ 1 đến 12", example = "11", required = true)
            @RequestParam
            @Min(value = 1, message = "Tháng phải từ 1 đến 12")
            @Max(value = 12, message = "Tháng phải từ 1 đến 12")
            Integer billingMonth,

            @Parameter(description = "Năm của kỳ", example = "2026", required = true)
            @RequestParam
            @Min(value = 2000, message = "Năm không hợp lệ")
            @Max(value = 2100, message = "Năm không hợp lệ")
            Integer billingYear
    ) {
        log.info("Getting invoice dashboard: buildingId={}, month={}, year={}",
                buildingId, billingMonth, billingYear);

        InvoiceDashboardResponse dashboard = invoiceService.getInvoiceDashboard(
                buildingId, billingMonth, billingYear);

        return ApiResponse.<InvoiceDashboardResponse>builder()
                .code(200)
                .message("Get invoice dashboard successfully")
                .result(dashboard)
                .build();
    }

    @GetMapping("/available-contracts")
    @Operation(
            summary = "Xem hợp đồng có thể lập hóa đơn",
            description = "Hợp đồng đang hiệu lực, thời hạn có giao với kỳ và chưa có hóa đơn (chưa hủy) trong kỳ"
    )
    public ApiResponse<List<InvoiceContractOptionResponse>> getAvailableContracts(
            @Parameter(description = "Tháng của kỳ, từ 1 đến 12", example = "11", required = true)
            @RequestParam
            @Min(value = 1, message = "Tháng phải từ 1 đến 12")
            @Max(value = 12, message = "Tháng phải từ 1 đến 12")
            Integer billingMonth,

            @Parameter(description = "Năm của kỳ", example = "2026", required = true)
            @RequestParam
            @Min(value = 2000, message = "Năm không hợp lệ")
            @Max(value = 2100, message = "Năm không hợp lệ")
            Integer billingYear
    ) {
        log.info("Getting available contracts: month={}, year={}",
                billingMonth, billingYear);

        List<InvoiceContractOptionResponse> contracts =
                invoiceService.getAvailableContracts(billingMonth, billingYear);

        return ApiResponse.<List<InvoiceContractOptionResponse>>builder()
                .code(200)
                .message("Get available contracts successfully")
                .result(contracts)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết hóa đơn",
            description = "Thông tin hóa đơn kèm các dòng tiền và lịch sử thanh toán"
    )
    public ApiResponse<InvoiceDetailResponse> getInvoiceById(
            @Parameter(description = "ID hóa đơn", example = "1")
            @PathVariable Long id
    ) {
        log.info("Getting invoice by id: {}", id);

        InvoiceDetailResponse invoice = invoiceService.getInvoiceById(id);

        return ApiResponse.<InvoiceDetailResponse>builder()
                .code(200)
                .message("Get invoice successfully")
                .result(invoice)
                .build();
    }

    @PostMapping
    @Operation(
            summary = "Lập hóa đơn",
            description = "Lập hóa đơn từ hợp đồng và kỳ. Tự dựng các dòng tiền phòng, điện, nước, dịch vụ "
                    + "và cộng phụ phí hoặc giảm giá nhập tay"
    )
    public ApiResponse<InvoiceDetailResponse> createInvoice(
            @Valid @RequestBody InvoiceRequest request
    ) {
        log.info("Creating invoice: contractId={}, month={}, year={}",
                request.getContractId(),
                request.getBillingMonth(),
                request.getBillingYear());

        InvoiceDetailResponse invoice = invoiceService.createInvoice(request);

        return ApiResponse.<InvoiceDetailResponse>builder()
                .code(201)
                .message("Invoice created successfully")
                .result(invoice)
                .build();
    }

    @PostMapping("/preview")
    @Operation(
            summary = "Xem trước hóa đơn",
            description = "Tính các dòng tự động (tiền phòng, điện, nước, dịch vụ) và tổng tiền theo hợp đồng "
                    + "và kỳ. Không lưu dữ liệu"
    )
    public ApiResponse<InvoicePreviewResponse> previewInvoice(
            @Valid @RequestBody InvoicePreviewRequest request
    ) {
        log.info("Previewing invoice: contractId={}, month={}, year={}",
                request.getContractId(),
                request.getBillingMonth(),
                request.getBillingYear());

        InvoicePreviewResponse preview = invoiceService.previewInvoice(request);

        return ApiResponse.<InvoicePreviewResponse>builder()
                .code(200)
                .message("Preview invoice successfully")
                .result(preview)
                .build();
    }

    @PatchMapping("/{id}/cancel")
    @Operation(
            summary = "Hủy hóa đơn",
            description = "Chỉ hủy được hóa đơn chưa có thanh toán. Hệ thống mở khóa bản ghi điện nước "
                    + "để có thể lập lại hóa đơn"
    )
    public ApiResponse<InvoiceDetailResponse> cancelInvoice(
            @Parameter(description = "ID hóa đơn", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody InvoiceCancelRequest request
    ) {
        log.info("Cancelling invoice: id={}", id);

        InvoiceDetailResponse invoice = invoiceService.cancelInvoice(id, request);

        return ApiResponse.<InvoiceDetailResponse>builder()
                .code(200)
                .message("Invoice cancelled successfully")
                .result(invoice)
                .build();
    }
    @GetMapping("/{id}/pdf")
    @Operation(
            summary = "Tải hóa đơn (PDF)",
            description = "Xuất hóa đơn ra file PDF khổ A4: các khoản thu, tổng tiền, "
                    + "các lần đã thanh toán và thông tin chuyển khoản. Hóa đơn nào cũng tải được, kể cả đã hủy"
    )
    public ResponseEntity<byte[]> exportInvoicePdf(
            @Parameter(description = "ID hóa đơn", example = "1")
            @PathVariable Long id
    ) {
        log.info("Exporting invoice PDF: id={}", id);

        InvoicePdfFile file = invoiceService.exportInvoicePdf(id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(file.fileName(), StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .body(file.content());
    }

}