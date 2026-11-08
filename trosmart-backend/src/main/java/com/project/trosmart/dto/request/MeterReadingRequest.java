package com.project.trosmart.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class MeterReadingRequest {

    // Bắt buộc khi tạo mới. Khi sửa thì roomId lấy từ bản ghi nên có thể không gửi
    private Long roomId;

    @Min(value = 1, message = "Tháng phải từ 1 đến 12")
    @Max(value = 12, message = "Tháng phải từ 1 đến 12")
    private Integer billingMonth;

    @Min(value = 2000, message = "Năm không hợp lệ")
    @Max(value = 2100, message = "Năm không hợp lệ")
    private Integer billingYear;

    @DecimalMin(value = "0", message = "Chỉ số điện đầu kỳ không được âm")
    @Digits(integer = 10, fraction = 2, message = "Chỉ số điện đầu kỳ không hợp lệ")
    private BigDecimal electricityStart;

    @DecimalMin(value = "0", message = "Chỉ số điện cuối kỳ không được âm")
    @Digits(integer = 10, fraction = 2, message = "Chỉ số điện cuối kỳ không hợp lệ")
    private BigDecimal electricityEnd;

    @DecimalMin(value = "0", message = "Chỉ số nước đầu kỳ không được âm")
    @Digits(integer = 10, fraction = 2, message = "Chỉ số nước đầu kỳ không hợp lệ")
    private BigDecimal waterStart;

    @DecimalMin(value = "0", message = "Chỉ số nước cuối kỳ không được âm")
    @Digits(integer = 10, fraction = 2, message = "Chỉ số nước cuối kỳ không hợp lệ")
    private BigDecimal waterEnd;

    @PastOrPresent(message = "Ngày ghi không được ở tương lai")
    private LocalDate recordedDate;

    @Size(max = 300, message = "Ghi chú không được vượt quá 300 ký tự")
    private String note;

}