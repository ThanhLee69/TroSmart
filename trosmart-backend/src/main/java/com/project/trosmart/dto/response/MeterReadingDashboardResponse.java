package com.project.trosmart.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeterReadingDashboardResponse {

    private BigDecimal totalElectricityConsumption; // Tổng điện tiêu thụ (kWh)

    private BigDecimal totalWaterConsumption; // Tổng nước tiêu thụ (m³)

    private Long unrecordedRooms; // Số phòng chưa ghi chỉ số

    private Long recordedRooms; // Số phòng đã ghi chỉ số, gồm RECORDED và INVOICED
}