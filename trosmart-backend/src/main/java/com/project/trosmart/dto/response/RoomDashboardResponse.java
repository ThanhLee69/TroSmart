package com.project.trosmart.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomDashboardResponse {

    private Long totalRooms;

    private Long occupiedRooms;

    private Long availableRooms;

    private Long maintenanceRooms;

    private Double occupancyRate;
}