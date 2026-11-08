
package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.BuildingRequest;
import com.project.trosmart.dto.response.BuildingOptionResponse;
import com.project.trosmart.dto.response.BuildingResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.entity.Amenity;
import com.project.trosmart.entity.Building;
import com.project.trosmart.enums.AmenityScope;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.BuildingMapper;
import com.project.trosmart.repository.AmenityRepository;
import com.project.trosmart.repository.BuildingRepository;
import com.project.trosmart.service.BuildingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RequiredArgsConstructor
@Service
public class BuildingServiceImpl implements BuildingService {

    private final BuildingRepository buildingRepository;
    private final AmenityRepository amenityRepository;
    private final BuildingMapper buildingMapper;

    @Override
    @Transactional
    public BuildingResponse createBuilding(BuildingRequest request) {

        Building building = buildingMapper.toEntity(request);

        Set<Amenity> amenities =
                getBuildingAmenities(request.getAmenityIds());

        building.setAmenities(amenities);

        Building savedBuilding = buildingRepository.save(building);

        return buildingMapper.toResponse(savedBuilding);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<BuildingResponse> getBuildings(
            String keyword,
            int page,
            int size
    ) {

        PageRequest pageRequest = PageRequest.of(
                page - 1,
                size,
                Sort.by("createdAt").descending()
        );

        String normalizedKeyword =
                keyword == null || keyword.isBlank()
                        ? null
                        : keyword.trim();

        Page<Building> buildingPage =
                buildingRepository.search(
                        normalizedKeyword,
                        pageRequest
                );

        List<BuildingResponse> content =
                buildingPage.getContent()
                        .stream()
                        .map(buildingMapper::toResponse)
                        .toList();

        return PageResponse.<BuildingResponse>builder()
                .items(content)
                .currentPage(buildingPage.getNumber() + 1)
                .pageSize(buildingPage.getSize())
                .totalItems(buildingPage.getTotalElements())
                .totalPages(buildingPage.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public BuildingResponse getBuildingById(Long id) {

        Building building = buildingRepository.findById(id)
                .filter(item ->
                        !Boolean.TRUE.equals(item.getDeleted())
                )
                .orElseThrow(() ->
                        new AppException(ErrorCode.BUILDING_NOT_FOUND)
                );

        return buildingMapper.toResponse(building);
    }

    @Override
    @Transactional
    public BuildingResponse updateBuilding(
            Long id,
            BuildingRequest request
    ) {

        Building building = buildingRepository.findById(id)
                .filter(item ->
                        !Boolean.TRUE.equals(item.getDeleted())
                )
                .orElseThrow(() ->
                        new AppException(ErrorCode.BUILDING_NOT_FOUND)
                );

        buildingMapper.updateEntity(building, request);

        Set<Amenity> amenities =
                getBuildingAmenities(request.getAmenityIds());

        building.setAmenities(amenities);

        Building savedBuilding = buildingRepository.save(building);

        return buildingMapper.toResponse(savedBuilding);
    }

    @Override
    @Transactional
    public void deleteBuilding(Long id) {

        Building building = buildingRepository.findById(id)
                .filter(item ->
                        !Boolean.TRUE.equals(item.getDeleted())
                )
                .orElseThrow(() ->
                        new AppException(ErrorCode.BUILDING_NOT_FOUND)
                );

        building.setDeleted(true);

        buildingRepository.save(building);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BuildingResponse> getAllBuildings() {
        return buildingRepository.findAll()
                .stream()
                .filter(building -> !Boolean.TRUE.equals(building.getDeleted()))
                .map(buildingMapper::toResponse)
                .toList();
    }


    @Override
    @Transactional(readOnly = true)
    public List<BuildingOptionResponse> getBuildingOptions() {
        return buildingRepository.findAll().stream()
                .filter(building -> !Boolean.TRUE.equals(building.getDeleted()))
                .map(building -> BuildingOptionResponse.builder()
                        .id(building.getId())
                        .name(building.getName())
                        .build())
                .toList();
    }

    private Set<Amenity> getBuildingAmenities(Set<Long> amenityIds) {

        if (amenityIds == null || amenityIds.isEmpty()) {
            return new HashSet<>();
        }

        List<Amenity> amenities =
                amenityRepository.findAllById(amenityIds);

        // Kiểm tra ID tiện nghi không tồn tại
        if (amenities.size() != amenityIds.size()) {
            throw new AppException(ErrorCode.AMENITY_NOT_FOUND);
        }

        // Chỉ cho phép tiện nghi áp dụng cho tòa nhà
        boolean invalidScope = amenities.stream()
                .anyMatch(amenity ->
                        amenity.getScope() != AmenityScope.BUILDING
                                && amenity.getScope() != AmenityScope.BOTH
                );

        if (invalidScope) {
            throw new AppException(ErrorCode.AMENITY_INVALID_SCOPE);
        }

        return new HashSet<>(amenities);
    }
}
