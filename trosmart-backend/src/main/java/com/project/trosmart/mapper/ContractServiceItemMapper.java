
        package com.project.trosmart.mapper;

import com.project.trosmart.dto.response.ContractServiceItemResponse;
import com.project.trosmart.entity.ContractServiceItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ContractServiceItemMapper {

    @Mapping(target = "serviceId", source = "serviceItem.id")
    @Mapping(target = "name", source = "serviceName")
    @Mapping(target = "price", source = "unitPrice")
    @Mapping(target = "unit", source = "unit")
    @Mapping(target = "billingType", source = "serviceItem.billingType")
    ContractServiceItemResponse toResponse(
            ContractServiceItem contractServiceItem
    );
}
