package com.project.trosmart.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ContractCoTenantRequest {

    @NotNull(message = "Vui lòng chọn người thuê")
    private Long tenantId;

    // Không gửi thì lấy hôm nay
    private LocalDate moveInDate;
}