package com.project.trosmart.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InvoiceRequest {

    @NotNull(message = "Hợp đồng không được để trống")
    private Long contractId;

    @NotNull(message = "Tháng hóa đơn không được để trống")
    @Min(value = 1, message = "Tháng phải từ 1 đến 12")
    @Max(value = 12, message = "Tháng phải từ 1 đến 12")
    private Integer billingMonth;

    @NotNull(message = "Năm hóa đơn không được để trống")
    @Min(value = 2000, message = "Năm không hợp lệ")
    private Integer billingYear;

    @NotNull(message = "Ngày phát hành không được để trống")
    private LocalDate issueDate;

    @NotNull(message = "Hạn thanh toán không được để trống")
    private LocalDate dueDate;

    @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")
    private String note;

    @Valid
    private List<InvoiceManualItemRequest> items;
}
