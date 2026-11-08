package com.project.trosmart.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContractDashboardResponse {

    private long totalContracts;

    private long activeContracts;

    private long draftContracts;

    private long expiringContracts;
}