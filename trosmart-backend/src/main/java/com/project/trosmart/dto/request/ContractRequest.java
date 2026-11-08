
package com.project.trosmart.dto.request;

import com.project.trosmart.enums.PaymentCycle;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class ContractRequest {

    // Phòng được thuê
    @NotNull(message = "Vui lòng chọn phòng")
    private Long roomId;

    // Danh sách ID những người ở cùng phòng (không bao gồm người đứng tên hợp đồng)
    private List<Long> coTenantIds;

    // ID khách thuê đứng tên hợp đồng
    @NotNull(message = "Vui lòng chọn người đứng tên hợp đồng")
    @Positive(message = "ID người đứng tên hợp đồng phải lớn hơn 0")
    private Long primaryTenantId;

    // Danh sách dịch vụ và đơn giá áp dụng cho hợp đồng
    // Có thể null hoặc danh sách rỗng nếu không chọn dịch vụ
    private List<@NotNull(message = "Thông tin dịch vụ không được null") ContractServiceRequest> services;

    // Ngày bắt đầu hợp đồng
    @NotNull(message = "Vui lòng nhập ngày bắt đầu hợp đồng")
    private LocalDate startDate;

    // Ngày kết thúc hợp đồng
    @NotNull(message = "Vui lòng nhập ngày kết thúc hợp đồng")
    private LocalDate endDate;

    // Giá thuê được chốt trong hợp đồng
    @NotNull(message = "Vui lòng nhập giá thuê")
    @DecimalMin(
            value = "0.0",
            inclusive = false,
            message = "Giá thuê phải lớn hơn 0"
    )
    private BigDecimal rentPrice;

    // Tiền đặt cọc
    @NotNull(message = "Vui lòng nhập tiền đặt cọc")
    @DecimalMin(
            value = "0.0",
            message = "Tiền đặt cọc không được âm"
    )
    private BigDecimal deposit = BigDecimal.ZERO;

    // Ngày đến hạn thanh toán trong tháng
    @NotNull(message = "Vui lòng nhập ngày thanh toán")
    @Min(value = 1, message = "Ngày thanh toán tối thiểu là 1")
    @Max(value = 31, message = "Ngày thanh toán tối đa là 31")
    private Integer paymentDueDay;

    // Chu kỳ thanh toán
    @NotNull(message = "Vui lòng chọn chu kỳ thanh toán")
    private PaymentCycle paymentCycle;

    // Ghi chú
    @Size(
            max = 5000,
            message = "Ghi chú không được vượt quá 5000 ký tự"
    )
    private String notes;    // Ngày kết thúc phải sau ngày bắt đầu
    @AssertTrue(message = "Ngày kết thúc phải sau ngày bắt đầu")
    public boolean isEndDateValid() {
        if (startDate == null || endDate == null) {
            return true;
        }
        return endDate.isAfter(startDate);
    }
}
