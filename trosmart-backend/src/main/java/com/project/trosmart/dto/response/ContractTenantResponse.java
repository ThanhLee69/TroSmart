package com.project.trosmart.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
public class ContractTenantResponse {

    private Long id;
    private Long tenantId;
    private String tenantName;
    private String tenantPhone;
    private Boolean isPrimary;
    private LocalDate moveInDate;
}