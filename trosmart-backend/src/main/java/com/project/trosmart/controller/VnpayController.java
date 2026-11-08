package com.project.trosmart.controller;

import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.service.TenantPortalService;
import com.project.trosmart.service.VnpayService;
import com.project.trosmart.service.VnpayService.VnpayResult;
import com.project.trosmart.configuration.VnpayConfiguration;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payment")
@RequiredArgsConstructor
@Tag(name = "Thanh toán VNPay", description = "Thanh toán hóa đơn qua cổng VNPay (sandbox)")
public class VnpayController {

    private final VnpayService vnpayService;
    private final TenantPortalService tenantPortalService;
    private final VnpayConfiguration props;

    // ---------- Khách thuê bấm "Thanh toán qua VNPay" ----------
    @PostMapping("/vnpay/create/{invoiceId}")
    @PreAuthorize("hasRole('TENANT')")
    @Operation(
            summary = "Tạo link thanh toán VNPay",
            description = "Tạo link thanh toán cho phần còn nợ của hóa đơn. "
                    + "Hóa đơn không thuộc khách đang đăng nhập sẽ trả về không tìm thấy"
    )
    public ApiResponse<String> createPayment(
            @PathVariable Long invoiceId,
            HttpServletRequest request
    ) {
        // Chỉ để kiểm tra hóa đơn có đúng là của khách này không (ném lỗi nếu không)
        tenantPortalService.getMyInvoiceDetail(invoiceId);

        return ApiResponse.<String>builder()
                .code(200)
                .message("Create VNPay payment url successfully")
                .result(vnpayService.createPaymentUrl(invoiceId, clientIp(request)))
                .build();
    }

    // ---------- VNPay gọi thẳng về server (IPN), không cần đăng nhập ----------
    @GetMapping("/vnpay-ipn")
    @Operation(summary = "VNPay báo kết quả thanh toán (IPN)")
    public Map<String, String> ipn(HttpServletRequest request) {
        VnpayResult result = vnpayService.handleCallback(readParams(request));

        Map<String, String> body = new LinkedHashMap<>();
        body.put("RspCode", result.rspCode());
        body.put("Message", result.message());
        return body;
    }

    // ---------- Trình duyệt người dùng quay về sau khi thanh toán ----------
    @GetMapping("/vnpay-return")
    @Operation(summary = "Người dùng quay về sau khi thanh toán VNPay")
    public ResponseEntity<Void> back(HttpServletRequest request) {
        // Chạy luôn việc ghi nhận ở đây: khi chạy local chưa có ngrok cho IPN vẫn cập nhật được
        VnpayResult result = vnpayService.handleCallback(readParams(request));

        String status = result.success() ? "success"
                : "97".equals(result.rspCode()) ? "invalid" : "failed";

        String template = props.getFrontendInvoiceUrl();
        String target = result.invoiceId() != null
                ? template.replace("{id}", String.valueOf(result.invoiceId()))
                : template.replace("/{id}", "");

        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(target + "?payment=" + status).toString())
                .build();
    }

    // ---------- Hàm phụ ----------

    private Map<String, String> readParams(HttpServletRequest request) {
        Map<String, String> params = new LinkedHashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0) {
                params.put(key, values[0]);
            }
        });
        return params;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = (forwarded != null && !forwarded.isBlank())
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();

        // Chạy local sẽ ra dạng IPv6, VNPay cần IPv4
        return (ip == null || ip.contains(":")) ? "127.0.0.1" : ip;
    }
}