
package com.project.trosmart.dto.request;

import com.project.trosmart.enums.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantVehicleRequest {


    @NotNull(message = "Vui lòng chọn khách thuê")
    private Long tenantId;

    @NotNull(message = "Vui lòng chọn loại phương tiện")
    private VehicleType vehicleType;

    @NotBlank(message = "Vui lòng nhập biển số xe")
    @Size(max = 20, message = "Biển số xe không được vượt quá 20 ký tự")
    private String licensePlate;

    @Size(max = 100, message = "Hãng xe không được vượt quá 100 ký tự")
    private String brand;

    @Size(max = 50, message = "Màu xe không được vượt quá 50 ký tự")
    private String color;

    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String note;
}
