package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.ServiceItemRequest;
import com.project.trosmart.dto.response.ServiceItemResponse;
import com.project.trosmart.entity.ServiceItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ServiceItemMapper {

    /**
     * Chuyển ServiceItemRequest thành ServiceItem.
     */
    @Mapping(target = "id", ignore = true)
    ServiceItem toEntity(ServiceItemRequest request);

    /**
     * Cập nhật thông tin dịch vụ.
     * Không cập nhật các trường quản lý hệ thống.
     */
    @Mapping(target = "id", ignore = true)
    void updateEntity(
            @MappingTarget ServiceItem entity,
            ServiceItemRequest request
    );

    /**
     * Chuyển ServiceItem thành ServiceItemResponse.
     */
    ServiceItemResponse toResponse(ServiceItem entity);
}