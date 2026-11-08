
package com.project.trosmart.dto.response;

import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.PaymentCycle;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyContractResponse {

    private Long id;
    private String contractCode;
    private ContractStatus status;

    // Phòng
    private Long roomId;
    private String roomNumber;
    private String buildingName;
    private Integer floor;
    private BigDecimal area;
    private List<String> amenities;

    // Thời hạn
    private LocalDate startDate;
    private LocalDate endDate;

    // Tiền thuê và thanh toán
    private BigDecimal rentPrice;
    private BigDecimal deposit;
    private Integer paymentDueDay;
    private PaymentCycle paymentCycle;

    // Chỉ số công tơ lúc bàn giao phòng
    private BigDecimal initialElectricityReading;
    private BigDecimal initialWaterReading;


    // Người ở và dịch vụ
    private List<MyContractTenantResponse> contractTenants;
    private List<MyContractServiceResponse> contractServices;

    // Người ở trong phòng: chỉ tên và vai trò
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MyContractTenantResponse {
        private Long tenantId;
        private String tenantName;
        private Boolean isPrimary;
    }

    // Dịch vụ áp dụng cho hợp đồng, kèm đơn giá đã chốt
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MyContractServiceResponse {
        private Long serviceId;
        private String name;
        private BigDecimal price;
        private String unit;
        private String billingType;
    }
}