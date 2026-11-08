
        package com.project.trosmart.service;

import com.project.trosmart.dto.request.TenantVehicleRequest;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.TenantOptionResponse;
import com.project.trosmart.dto.response.TenantVehicleResponse;
import com.project.trosmart.enums.VehicleType;


import java.util.List;

public interface TenantVehicleService {

    PageResponse<TenantVehicleResponse> getVehicles(
            Long tenantId,
            String keyword,
            VehicleType vehicleType,
            int page,
            int size
    );
    TenantVehicleResponse getVehicleById(Long vehicleId);

    TenantVehicleResponse createVehicle(TenantVehicleRequest request);

    TenantVehicleResponse updateVehicle(
            Long vehicleId,
            TenantVehicleRequest request
    );
    List<TenantVehicleResponse> getVehiclesByTenantId(Long tenantId);

    void deleteVehicle(Long vehicleId);

    List<TenantOptionResponse> getAvailableTenants(String keyword);
}
