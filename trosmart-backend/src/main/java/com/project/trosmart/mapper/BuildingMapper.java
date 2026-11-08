
package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.BuildingRequest;
import com.project.trosmart.dto.response.AmenitySummaryResponse;
import com.project.trosmart.dto.response.BuildingResponse;
import com.project.trosmart.entity.Amenity;
import com.project.trosmart.entity.Building;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;
import java.util.Set;

@Mapper(componentModel = "spring")
public interface BuildingMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "amenities", ignore = true)
    Building toEntity(BuildingRequest request);

    @Mapping(
            target = "amenities",
            expression = "java(mapAmenities(building.getAmenities()))"
    )
    BuildingResponse toResponse(Building building);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "amenities", ignore = true)
    void updateEntity(
            @MappingTarget Building building,
            BuildingRequest request
    );

    default List<AmenitySummaryResponse> mapAmenities(
            Set<Amenity> amenities
    ) {
        if (amenities == null) {
            return List.of();
        }

        return amenities.stream()
                .map(amenity -> AmenitySummaryResponse.builder()
                        .id(amenity.getId())
                        .name(amenity.getName())
                        .build())
                .toList();
    }
}
