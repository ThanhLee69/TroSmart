package com.project.trosmart.dto.response;

import lombok.*;

import java.math.BigDecimal;

// Thống kê hóa đơn của một kỳ (không tính hóa đơn đã hủy)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceDashboardResponse {

    private long invoiceCount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private long overdueCount;
}
