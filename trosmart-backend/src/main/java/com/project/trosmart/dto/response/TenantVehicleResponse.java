
package com.project.trosmart.dto.response;

import com.project.trosmart.enums.VehicleType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantVehicleResponse {

    private Long id;

    private Long tenantId;

    private String tenantName;

    private VehicleType vehicleType;

    private String licensePlate;

    private String brand;

    private String color;

    private String note;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
