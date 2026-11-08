package com.project.trosmart.dto.response;

import com.project.trosmart.enums.MeterReadingStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeterReadingDetailResponse {

    private Long id;

    private Long roomId;

    private String roomNumber;

    private String buildingName;

    // Thông tin hợp đồng
    private String tenantName;

    private String contractCode;

    private Integer billingMonth;

    private Integer billingYear;

    // Chỉ số điện
    private BigDecimal electricityStart;

    private BigDecimal electricityEnd;

    private BigDecimal electricityConsumption;

    // Giá điện (VNĐ/kWh)
    private BigDecimal electricityPrice;

    // Chỉ số nước
    private BigDecimal waterStart;

    private BigDecimal waterEnd;

    private BigDecimal waterConsumption;

    // Giá nước (VNĐ/m³)
    private BigDecimal waterPrice;

    // Ngày ghi chỉ số cuối kỳ
    private LocalDate recordedDate;

    // Ghi chú
    private String note;

    // Trạng thái bản ghi
    private MeterReadingStatus status;

    private String createdBy;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}