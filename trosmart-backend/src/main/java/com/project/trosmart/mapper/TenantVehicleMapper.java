
package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.TenantVehicleRequest;
import com.project.trosmart.dto.response.TenantVehicleResponse;
import com.project.trosmart.entity.TenantVehicle;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TenantVehicleMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenant", ignore = true)

    TenantVehicle toEntity(TenantVehicleRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenant", ignore = true)

    void updateEntity(
            TenantVehicleRequest request,
            @MappingTarget TenantVehicle vehicle
    );

    @Mapping(target = "tenantId", source = "tenant.id")
    @Mapping(target = "tenantName", source = "tenant.fullName")
    TenantVehicleResponse toResponse(TenantVehicle vehicle);
}
