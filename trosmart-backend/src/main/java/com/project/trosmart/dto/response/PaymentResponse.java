package com.project.trosmart.dto.response;

import com.project.trosmart.enums.PaymentMethod;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor

public class PaymentResponse {

    private Long id;

    private Long invoiceId;

    private String invoiceCode;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private LocalDateTime paymentDate;
    private String transactionCode;
    private String note;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
