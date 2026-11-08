package com.project.trosmart.dto.response;

import com.project.trosmart.enums.InvoiceItemType;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.PaymentMethod;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// Chi tiết một hóa đơn của khách, kèm các khoản và các lần đã thanh toán
@Getter
@Setter
@Builder
public class MyInvoiceDetailResponse {

    private Long id;
    private String invoiceCode;
    private Integer billingMonth;
    private Integer billingYear;
    private LocalDate issueDate;
    private LocalDate dueDate;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private InvoiceStatus status;
    private Boolean overdue;
    private String note;

    private List<Item> items;
    private List<PaymentInfo> payments;

    @Getter
    @Builder
    public static class Item {
        private Long id;
        private InvoiceItemType itemType;
        private String itemName;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal amount;
    }

    @Getter
    @Builder
    public static class PaymentInfo {
        private Long id;
        private BigDecimal amount;
        private PaymentMethod paymentMethod;
        private LocalDateTime paymentDate;
        private String transactionCode;
    }
}