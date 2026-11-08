
package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.AmenityRequest;
import com.project.trosmart.dto.response.AmenityResponse;
import com.project.trosmart.entity.Amenity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface AmenityMapper {

    // Request -> Entity
    @Mapping(target = "id", ignore = true)
    Amenity toEntity(AmenityRequest request);

    // Entity -> Response
    AmenityResponse toResponse(Amenity amenity);

    // Cập nhật Entity từ Request
    @Mapping(target = "id", ignore = true)
    void updateEntity(
            @MappingTarget Amenity amenity,
            AmenityRequest request
    );
}
