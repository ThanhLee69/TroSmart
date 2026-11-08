package com.project.trosmart.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Một dòng trong "Lịch sử thuê" của khách thuê. */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantContractHistoryResponse {

    private Long id;
    private String contractCode;

    private String roomNumber;
    private String buildingName;

    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate actualEndDate;

    private BigDecimal rentPrice;

    /** Tên enum ContractStatus, ví dụ ACTIVE. */
    private String status;

    /** true nếu khách là người thuê chính của hợp đồng này. */
    private boolean primary;
}