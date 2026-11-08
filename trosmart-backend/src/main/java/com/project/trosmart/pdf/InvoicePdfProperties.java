package com.project.trosmart.pdf;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Tài khoản ngân hàng nhận tiền, in trong khung "Thông tin chuyển khoản" của hóa đơn.
 * Khai báo trong application.yml:
 *
 * app:
 *   invoice:
 *     bank:
 *       name: Vietcombank
 *       account-number: "0123456789"
 *       account-holder: NGUYEN VAN A
 *
 * Chưa khai báo số tài khoản thì hóa đơn không in khung này.
 * Tên chủ trọ và số điện thoại lấy từ app.contract.landlord (dùng chung với hợp đồng).
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.invoice")
public class InvoicePdfProperties {

    private Bank bank = new Bank();

    @Data
    public static class Bank {
        private String name;
        private String accountNumber;
        private String accountHolder;
    }
}
