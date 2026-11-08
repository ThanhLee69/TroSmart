
        package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.TenantRequest;
import com.project.trosmart.dto.response.TenantResponse;
import com.project.trosmart.entity.Tenant;

import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface TenantMapper {

    /**
     * Chuyển TenantRequest thành Tenant khi tạo mới.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "identityFrontImage", ignore = true)
    @Mapping(target = "identityBackImage", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "rentalStatus", ignore = true)
    Tenant toEntity(TenantRequest request);

    /**
     * Cập nhật thông tin khách thuê.
     * Không ghi đè các trường không được gửi lên.
     */
    @BeanMapping(
            nullValuePropertyMappingStrategy =
                    NullValuePropertyMappingStrategy.IGNORE
    )
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "identityFrontImage", ignore = true)
    @Mapping(target = "identityBackImage", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "rentalStatus", ignore = true)
    void updateEntity(
            TenantRequest request,
            @MappingTarget Tenant tenant
    );

    /**
     * Chuyển Tenant thành TenantResponse.
     * rentalStatus được lấy trực tiếp từ entity Tenant.
     */
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "buildingName", ignore = true)
    @Mapping(target = "roomNumber", ignore = true)
    TenantResponse toResponse(Tenant tenant);
}
