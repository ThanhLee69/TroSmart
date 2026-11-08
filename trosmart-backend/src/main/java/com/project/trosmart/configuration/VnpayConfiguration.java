package com.project.trosmart.configuration;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Cấu hình cổng thanh toán VNPay (đọc từ application.yml, mục app.vnpay) */
@Getter
@Component
public class VnpayConfiguration {

    @Value("${app.vnpay.tmn-code}")
    private String tmnCode;

    @Value("${app.vnpay.hash-secret}")
    private String hashSecret;

    @Value("${app.vnpay.pay-url}")
    private String payUrl;

    /** Địa chỉ BE mà VNPay đưa trình duyệt người dùng quay về sau khi thanh toán */
    @Value("${app.vnpay.return-url}")
    private String returnUrl;

    /** Trang chi tiết hóa đơn ở FE, có {id}. Ví dụ http://localhost:5173/tenant/invoices/{id} */
    @Value("${app.vnpay.frontend-invoice-url}")
    private String frontendInvoiceUrl;
}
