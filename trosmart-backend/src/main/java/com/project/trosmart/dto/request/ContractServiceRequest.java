
package com.project.trosmart.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ContractServiceRequest {

    // ID dịch vụ
    @NotNull(message = "Vui lòng chọn dịch vụ")
    @Positive(message = "ID dịch vụ phải lớn hơn 0")
    private Long serviceId;

    // Đơn giá dịch vụ áp dụng cho hợp đồng
    @NotNull(message = "Vui lòng nhập đơn giá dịch vụ")
    @DecimalMin(
            value = "0.0",
            message = "Đơn giá dịch vụ không được âm"
    )
    private BigDecimal unitPrice;
}
