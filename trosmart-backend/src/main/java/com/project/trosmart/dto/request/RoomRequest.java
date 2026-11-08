package com.project.trosmart.dto.request;

import com.project.trosmart.enums.RoomType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomRequest {

    @NotBlank(message = "Mã phòng không được để trống")
    @Size(max = 50, message = "Mã phòng không được vượt quá 50 ký tự")
    private String roomNumber;

    @NotNull(message = "Tòa nhà không được để trống")
    private Long buildingId;

    @NotNull(message = "Loại phòng không được để trống")
    private RoomType roomType;

    @NotNull(message = "Tầng không được để trống")
    @Min(value = 0, message = "Tầng không được nhỏ hơn 0")
    private Integer floor;

    @NotNull(message = "Diện tích không được để trống")
    @DecimalMin(value = "0.01", message = "Diện tích phải lớn hơn 0")
    private BigDecimal area;

    @NotNull(message = "Giá thuê không được để trống")
    @DecimalMin(value = "0.0", message = "Giá thuê không được âm")
    private BigDecimal rentalPrice;

    @NotNull(message = "Sức chứa không được để trống")
    @Min(value = 1, message = "Sức chứa tối thiểu là 1 người")
    private Integer maxOccupancy;

    @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
    private String description;

    private Set<Long> amenityIds;
}