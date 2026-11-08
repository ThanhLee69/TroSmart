package com.project.trosmart.dto.response;

import com.project.trosmart.enums.PaymentCycle;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

// Một hợp đồng trong ô chọn hợp đồng của trang Lập hóa đơn
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceContractOptionResponse {

    private Long contractId;
    private String contractCode;

    private Long roomId;
    private String roomNumber;
    private String buildingName;

    private String tenantName;

    private BigDecimal rentPrice;
    private Integer paymentDueDay;
    private PaymentCycle paymentCycle;

    // Hạn thanh toán gợi ý để frontend điền sẵn
    private LocalDate suggestedDueDate;
}
