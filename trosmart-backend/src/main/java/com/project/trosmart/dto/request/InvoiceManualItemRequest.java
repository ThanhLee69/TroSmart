package com.project.trosmart.dto.request;

import com.project.trosmart.enums.InvoiceItemType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InvoiceManualItemRequest {

    @NotBlank(message = "Tên khoản phí không được để trống")
    @Size(max = 255, message = "Tên khoản phí không được vượt quá 255 ký tự")
    private String itemName;

    @NotNull(message = "Loại khoản phí không được để trống")
    private InvoiceItemType itemType;

    @NotNull(message = "Số lượng không được để trống")
    @DecimalMin(value = "0.0", inclusive = false,
            message = "Số lượng phải lớn hơn 0")
    private BigDecimal quantity;

    @NotNull(message = "Vui lòng nhập đơn giá")
    @DecimalMin(value = "0.01", message = "Đơn giá phải lớn hơn 0")
    @Digits(integer = 13, fraction = 2, message = "Đơn giá không hợp lệ")
    private BigDecimal unitPrice;

}

