package com.project.trosmart.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Số liệu tóm tắt hóa đơn của khách thuê đang đăng nhập:
 * dùng cho khối "Còn phải đóng" và số lượng trên các tab lọc.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyInvoiceSummaryResponse {

    // Tổng số hóa đơn khách nhìn thấy
    private Long totalCount;

    // Hóa đơn còn phải đóng (chưa đóng, đóng một phần, quá hạn)
    private Long openCount;

    // Trong số đó, số hóa đơn đã quá hạn
    private Long overdueCount;

    // Hóa đơn đã thanh toán đủ
    private Long paidCount;

    // Tổng tiền còn phải đóng
    private BigDecimal amountDue;
}