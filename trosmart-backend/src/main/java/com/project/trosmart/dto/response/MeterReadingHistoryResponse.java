package com.project.trosmart.dto.response;

import com.project.trosmart.enums.MeterReadingStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeterReadingHistoryResponse {

    private Long id;

    private Integer billingMonth;

    private Integer billingYear;

    // Chỉ số điện
    private BigDecimal electricityStart;
    private BigDecimal electricityEnd;
    private BigDecimal electricityConsumption;

    // Chỉ số nước
    private BigDecimal waterStart;
    private BigDecimal waterEnd;
    private BigDecimal waterConsumption;

    // Ngày ghi chỉ số cuối kỳ
    private LocalDate recordedDate;

    // Trạng thái bản ghi
    private MeterReadingStatus status;
}