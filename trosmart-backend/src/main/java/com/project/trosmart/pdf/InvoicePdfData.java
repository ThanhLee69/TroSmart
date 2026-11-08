package com.project.trosmart.pdf;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/**
 * Dữ liệu đã định dạng sẵn (chuỗi) để điền vào templates/invoice/invoice-pdf.html.
 * Dùng @Value (getter thường) chứ không dùng record vì Thymeleaf đọc thuộc tính bằng OGNL.
 */
@Value
@Builder
public class InvoicePdfData {

    // Đầu hóa đơn
    String buildingName;
    String buildingAddress;
    String landlordName;
    String landlordPhone;

    String invoiceCode;
    String issueDate;
    String dueDate;
    String periodLabel;

    // statusClass: paid, unpaid, partial, overdue, cancelled (khớp class CSS trong mẫu)
    String statusClass;
    String statusLabel;

    // Khách thuê
    String tenantName;
    String tenantPhone;
    String roomNumber;
    String contractCode;

    // Các khoản và tổng tiền
    List<Item> items;
    String total;
    String paid;
    String remaining;
    String totalWords;

    // Các lần đã thanh toán (cũ trước, mới sau)
    boolean hasPayments;
    List<PaymentRow> payments;

    // Thông tin chuyển khoản; hasBank = false thì ẩn khung
    boolean hasBank;
    String bankName;
    String bankAccountNumber;
    String bankAccountHolder;
    String transferContent;

    // Ghi chú, null nếu không có
    String note;

    @Value
    @Builder
    public static class Item {
        int index;
        String name;
        // Dòng phụ nhỏ bên dưới tên khoản, ví dụ chỉ số điện nước; null nếu không có
        String detail;
        String quantity;
        String unitPrice;
        String amount;
    }

    @Value
    @Builder
    public static class PaymentRow {
        String date;
        String method;
        String code;
        String amount;
    }
}
