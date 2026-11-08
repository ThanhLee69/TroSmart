package com.project.trosmart.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

/**
 * Doanh thu theo tháng cho biểu đồ ở trang Tổng quan.
 */
@Getter
@Builder
public class DashboardRevenueResponse {

    private List<Row> rows;

    // Tổng đã thu của năm trước (chỉ có khi xem theo năm), null nếu không có dữ liệu
    private BigDecimal previousTotal;

    @Getter
    @Builder
    public static class Row {
        // "T1" ... "T12"
        private String label;
        // Hai số cuối của năm, chỉ dùng khi xem 12 tháng gần nhất ("25", "26")
        private String sub;
        // null nghĩa là tháng chưa tới, để giao diện bỏ trống
        private BigDecimal collected;
        private BigDecimal expected;
        private long invoices;
    }
}