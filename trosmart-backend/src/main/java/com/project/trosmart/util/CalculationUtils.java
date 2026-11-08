package com.project.trosmart.util;


import com.project.trosmart.entity.Invoice;
import com.project.trosmart.enums.InvoiceStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;

// Các hàm tính tiền và trạng thái hóa đơn dùng chung cho InvoiceService, PaymentService...
// Chỉ tính toán trên dữ liệu truyền vào, không truy cập database
public final class CalculationUtils {

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private CalculationUtils() {
    }

    // Làm tròn tiền 2 chữ số thập phân cho khớp cột DB
    public static BigDecimal roundMoney(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    // Ghi lại số đã trả, số còn nợ và trạng thái của hóa đơn
    public static void recalculate(Invoice invoice, BigDecimal paidAmount) {
        BigDecimal paid = roundMoney(paidAmount);
        BigDecimal remaining = invoice.getTotalAmount()
                .subtract(paid)
                .max(BigDecimal.ZERO);

        invoice.setPaidAmount(paid);
        invoice.setRemainingAmount(remaining);
        invoice.setStatus(resolveStatus(invoice));
    }

    // Trạng thái theo số tiền và hạn thanh toán; hóa đơn đã hủy giữ nguyên
    public static InvoiceStatus resolveStatus(Invoice invoice) {
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            return InvoiceStatus.CANCELLED;
        }
        if (invoice.getRemainingAmount().signum() <= 0) {
            return InvoiceStatus.PAID;
        }
        if (invoice.getDueDate().isBefore(LocalDate.now(VIETNAM_ZONE))) {
            return InvoiceStatus.OVERDUE;
        }
        if (invoice.getPaidAmount().signum() > 0) {
            return InvoiceStatus.PARTIALLY_PAID;
        }
        return InvoiceStatus.UNPAID;
    }
}