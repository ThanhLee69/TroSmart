package com.project.trosmart.dto.response;

import com.project.trosmart.enums.InvoiceStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceResponse {

    private Long id;
    private String invoiceCode;

    private Long contractId;
    private String contractCode;
    private String tenantName;
    private String roomNumber;
    private String buildingName;


    private Integer billingMonth;
    private Integer billingYear;

    private LocalDate dueDate;

    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;

    private InvoiceStatus status;

}
