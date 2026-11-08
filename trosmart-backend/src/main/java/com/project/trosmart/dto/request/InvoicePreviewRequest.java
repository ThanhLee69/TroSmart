package com.project.trosmart.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InvoicePreviewRequest {

    @NotNull(message = "Hợp đồng không được để trống")
    private Long contractId;

    @NotNull(message = "Tháng hóa đơn không được để trống")
    @Min(value = 1, message = "Tháng phải từ 1 đến 12")
    @Max(value = 12, message = "Tháng phải từ 1 đến 12")
    private Integer billingMonth;

    @NotNull(message = "Năm hóa đơn không được để trống")
    @Min(value = 2000, message = "Năm không hợp lệ")
    private Integer billingYear;
}
