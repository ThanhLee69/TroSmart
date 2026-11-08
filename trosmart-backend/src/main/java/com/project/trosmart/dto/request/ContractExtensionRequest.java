package com.project.trosmart.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class ContractExtensionRequest {

    @NotNull(message = "Vui lòng nhập ngày kết thúc mới")
    @Future(message = "Ngày kết thúc mới phải nằm trong tương lai")
    private LocalDate newEndDate;

    @DecimalMin(value = "0.0", inclusive = false,
            message = "Giá thuê phải lớn hơn 0")
    private BigDecimal rentPrice;

    @Size(max = 5000, message = "Ghi chú không được vượt quá 5000 ký tự")
    private String notes;
}