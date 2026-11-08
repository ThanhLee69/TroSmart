package com.project.trosmart.dto.response;

import com.project.trosmart.enums.VehicleType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class MyVehicleResponse {

    private Long id;
    private VehicleType vehicleType;
    private String licensePlate;
    private String brand;
    private String color;
}