package com.project.trosmart.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InvoiceCancelRequest {

    @NotBlank(message = "Vui lòng nhập lý do hủy hóa đơn")
    @Size(max = 300, message = "Lý do hủy không được vượt quá 300 ký tự")
    private String reason;
}
