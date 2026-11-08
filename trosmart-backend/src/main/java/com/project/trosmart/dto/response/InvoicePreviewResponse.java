package com.project.trosmart.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

// Các dòng tự động (tiền phòng, điện, nước, dịch vụ) và tổng của chúng.
// Chưa gồm phụ phí và giảm giá nhập tay.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoicePreviewResponse {

    private List<InvoiceItemResponse> items;
    private BigDecimal totalAmount;
}
