package com.project.trosmart.dto.response;

import com.project.trosmart.enums.BillingType;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ContractServiceItemResponse {

    private Long id;

    private Long serviceId;

    private String name;

    private BigDecimal price;

    private String unit;

    private BillingType billingType;
}