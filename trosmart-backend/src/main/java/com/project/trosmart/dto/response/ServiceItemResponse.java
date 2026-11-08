package com.project.trosmart.dto.response;

import com.project.trosmart.enums.BillingType;
import com.project.trosmart.enums.ServiceCode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceItemResponse {

    private Long id;

    private String name;

    private BigDecimal unitPrice;

    private String unit;

    private BillingType billingType;

    private ServiceCode serviceCode;

    private Boolean defaultService;

    private String description;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}