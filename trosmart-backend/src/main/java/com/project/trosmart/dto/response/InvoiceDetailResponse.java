package com.project.trosmart.dto.response;

import com.project.trosmart.enums.InvoiceStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceDetailResponse {

    private Long id;
    private String invoiceCode;
    private Long contractId;
    private String contractCode;
    private Long roomId;
    private String roomNumber;
    private String buildingName;
    private String tenantName;
    private String tenantPhone;

    private Integer billingMonth;
    private Integer billingYear;
    private LocalDate issueDate;
    private LocalDate dueDate;

    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private InvoiceStatus status;
    private String note;

    // Chỉ số điện nước của kỳ (null nếu hóa đơn đã hủy hoặc hợp đồng không có điện nước)
    private BigDecimal electricityStart;
    private BigDecimal electricityEnd;
    private BigDecimal waterStart;
    private BigDecimal waterEnd;

    // Chỉ có giá trị khi status = CANCELLED
    private String cancelReason;
    private LocalDateTime cancelledAt;
    private String cancelledBy;

    private List<InvoiceItemResponse> items;
    private List<PaymentResponse> payments;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
}
