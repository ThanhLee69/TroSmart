
package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.AmenityRequest;
import com.project.trosmart.dto.response.AmenityResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.entity.Amenity;
import com.project.trosmart.enums.AmenityScope;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.AmenityMapper;
import com.project.trosmart.repository.AmenityRepository;
import com.project.trosmart.service.AmenityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AmenityServiceImpl implements AmenityService {

    private final AmenityRepository amenityRepository;
    private final AmenityMapper amenityMapper;

    @Override
    @Transactional
    public AmenityResponse createAmenity(AmenityRequest request) {
        String name = request.getName().trim();

        if (amenityRepository.existsByNameIgnoreCaseAndDeletedFalse(name)) {
            throw new AppException(ErrorCode.AMENITY_EXISTED);
        }

        request.setName(name);

        Amenity amenity = amenityMapper.toEntity(request);
        Amenity savedAmenity = amenityRepository.save(amenity);

        return amenityMapper.toResponse(savedAmenity);
    }

    @Override
    @Transactional(readOnly = true)
    public AmenityResponse getAmenityById(Long id) {
        Amenity amenity = getActiveAmenity(id);
        return amenityMapper.toResponse(amenity);
    }

    @Override
    @Transactional
    public AmenityResponse updateAmenity(
            Long id,
            AmenityRequest request
    ) {
        Amenity amenity = getActiveAmenity(id);
        String name = request.getName().trim();

        if (amenityRepository
                .existsByNameIgnoreCaseAndIdNotAndDeletedFalse(name, id)) {
            throw new AppException(ErrorCode.AMENITY_EXISTED);
        }

        request.setName(name);
        amenityMapper.updateEntity(amenity, request);

        Amenity savedAmenity = amenityRepository.save(amenity);

        return amenityMapper.toResponse(savedAmenity);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AmenityResponse> getAmenities(
            String keyword,
            AmenityScope scope,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        String normalizedKeyword =
                keyword == null || keyword.isBlank()
                        ? null
                        : keyword.trim();

        Page<Amenity> result = amenityRepository.search(
                normalizedKeyword,
                scope,
                pageable
        );

        List<AmenityResponse> items = result.getContent()
                .stream()
                .map(amenityMapper::toResponse)
                .toList();

        return PageResponse.<AmenityResponse>builder()
                .items(items)
                .currentPage(result.getNumber() + 1)
                .pageSize(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AmenityResponse> getBuildingAmenities() {
        return amenityRepository.findByScopes(
                        List.of(AmenityScope.BUILDING, AmenityScope.BOTH)
                ).stream()
                .map(amenityMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AmenityResponse> getRoomAmenities() {
        return amenityRepository.findByScopes(
                        List.of(AmenityScope.ROOM, AmenityScope.BOTH)
                ).stream()
                .map(amenityMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void deleteAmenity(Long id) {
        Amenity amenity = getActiveAmenity(id);
        amenity.setDeleted(true);
        amenityRepository.save(amenity);
    }

    private Amenity getActiveAmenity(Long id) {
        return amenityRepository.findById(id)
                .filter(amenity ->
                        !Boolean.TRUE.equals(amenity.getDeleted()))
                .orElseThrow(() ->
                        new AppException(ErrorCode.AMENITY_NOT_FOUND)
                );
    }
}
