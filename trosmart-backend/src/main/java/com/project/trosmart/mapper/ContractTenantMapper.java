package com.project.trosmart.mapper;


import com.project.trosmart.dto.response.ContractTenantResponse;
import com.project.trosmart.entity.ContractTenant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ContractTenantMapper {

    @Mapping(target = "tenantId", source = "tenant.id")
    @Mapping(target = "tenantName", source = "tenant.fullName")
    @Mapping(target = "tenantPhone", source = "tenant.phone")
    ContractTenantResponse toResponse(ContractTenant contractTenant);
}

