package com.project.trosmart.controller;

import com.project.trosmart.dto.request.PaymentRequest;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.InvoiceDetailResponse;
import com.project.trosmart.dto.response.PaymentResponse;
import com.project.trosmart.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Thanh toán hóa đơn. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/invoices/{invoiceId}/payments")
@RequiredArgsConstructor
@Slf4j(topic = "PAYMENT-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý thanh toán",
        description = "API ghi nhận và xem thanh toán của hóa đơn, chỉ dành cho quản trị viên (ADMIN)"
)
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @Operation(
            summary = "Ghi nhận thanh toán",
            description = "Ghi nhận một lần thanh toán cho hóa đơn. "
                    + "Trả về hóa đơn đã cập nhật số đã trả, số còn nợ và trạng thái"
    )
    public ApiResponse<InvoiceDetailResponse> createPayment(
            @Parameter(description = "ID hóa đơn", example = "1")
            @PathVariable Long invoiceId,
            @Valid @RequestBody PaymentRequest request
    ) {
        log.info("Creating payment: invoiceId={}, amount={}",
                invoiceId, request.getAmount());

        InvoiceDetailResponse invoice =
                paymentService.createPayment(invoiceId, request);

        return ApiResponse.<InvoiceDetailResponse>builder()
                .code(201)
                .message("Payment created successfully")
                .result(invoice)
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Xem lịch sử thanh toán của hóa đơn",
            description = "Danh sách các lần thanh toán của hóa đơn, mới nhất trước"
    )
    public ApiResponse<List<PaymentResponse>> getPaymentsByInvoice(
            @Parameter(description = "ID hóa đơn", example = "1")
            @PathVariable Long invoiceId
    ) {
        log.info("Getting payments: invoiceId={}", invoiceId);

        List<PaymentResponse> payments =
                paymentService.getPaymentsByInvoice(invoiceId);

        return ApiResponse.<List<PaymentResponse>>builder()
                .code(200)
                .message("Get payments successfully")
                .result(payments)
                .build();
    }

    @DeleteMapping("/{paymentId}")
    @Operation(
            summary = "Xóa thanh toán nhập nhầm",
            description = "Xóa mềm một lần thanh toán, sau đó tính lại số đã trả, số còn nợ "
                    + "và trạng thái hóa đơn. Trả về hóa đơn đã cập nhật"
    )
    public ApiResponse<InvoiceDetailResponse> deletePayment(
            @Parameter(description = "ID hóa đơn", example = "1")
            @PathVariable Long invoiceId,

            @Parameter(description = "ID lần thanh toán cần xóa", example = "1")
            @PathVariable Long paymentId
    ) {
        log.info("Deleting payment: invoiceId={}, paymentId={}",
                invoiceId, paymentId);

        InvoiceDetailResponse invoice =
                paymentService.deletePayment(invoiceId, paymentId);

        return ApiResponse.<InvoiceDetailResponse>builder()
                .code(200)
                .message("Payment deleted successfully")
                .result(invoice)
                .build();
    }
}