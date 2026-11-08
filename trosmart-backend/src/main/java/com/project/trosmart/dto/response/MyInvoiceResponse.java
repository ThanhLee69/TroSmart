package com.project.trosmart.dto.response;

import com.project.trosmart.enums.InvoiceStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

// Một dòng trong danh sách hóa đơn của khách
@Getter
@Setter
@Builder
public class MyInvoiceResponse {

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

    // Đã quá hạn nhưng trạng thái chưa được cập nhật sang OVERDUE
    private Boolean overdue;
}