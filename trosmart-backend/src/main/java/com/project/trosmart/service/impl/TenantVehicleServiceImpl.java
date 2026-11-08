
package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.TenantVehicleRequest;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.TenantOptionResponse;
import com.project.trosmart.dto.response.TenantVehicleResponse;
import com.project.trosmart.entity.Tenant;
import com.project.trosmart.entity.TenantVehicle;
import com.project.trosmart.enums.VehicleType;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.TenantVehicleMapper;
import com.project.trosmart.repository.TenantRepository;
import com.project.trosmart.repository.TenantVehicleRepository;
import com.project.trosmart.service.TenantVehicleService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TenantVehicleServiceImpl implements TenantVehicleService {

    private final TenantVehicleRepository tenantVehicleRepository;
    private final TenantRepository tenantRepository;
    private final TenantVehicleMapper tenantVehicleMapper;


    @Override
    @Transactional(readOnly = true)
    public PageResponse<TenantVehicleResponse> getVehicles(
            Long tenantId,
            String keyword,
            VehicleType vehicleType,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "id")
        );

        String normalizedKeyword = StringUtils.hasText(keyword)
                ? keyword.trim()
                : null;

        if (tenantId != null) {
            tenantRepository.findById(tenantId)
                    .orElseThrow(() ->
                            new AppException(ErrorCode.TENANT_NOT_FOUND));
        }

        Page<TenantVehicle> vehiclePage = tenantVehicleRepository.searchVehicles(
                tenantId,
                normalizedKeyword,
                vehicleType,
                pageable
        );

        List<TenantVehicleResponse> items = vehiclePage.getContent()
                .stream()
                .map(tenantVehicleMapper::toResponse)
                .toList();

        return PageResponse.<TenantVehicleResponse>builder()
                .items(items)
                .currentPage(vehiclePage.getNumber() + 1)
                .pageSize(vehiclePage.getSize())
                .totalItems(vehiclePage.getTotalElements())
                .totalPages(vehiclePage.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TenantVehicleResponse getVehicleById(Long vehicleId) {
        TenantVehicle vehicle = findVehicleById(vehicleId);

        return tenantVehicleMapper.toResponse(vehicle);
    }

    @Override
    public TenantVehicleResponse createVehicle(TenantVehicleRequest request) {
        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() ->
                        new AppException(ErrorCode.TENANT_NOT_FOUND));

        TenantVehicle vehicle = tenantVehicleMapper.toEntity(request);
        vehicle.setTenant(tenant);

        return tenantVehicleMapper.toResponse(
                tenantVehicleRepository.save(vehicle)
        );
    }

    @Override
    public TenantVehicleResponse updateVehicle(
            Long vehicleId,
            TenantVehicleRequest request
    ) {
        TenantVehicle vehicle = findVehicleById(vehicleId);

        if (request.getTenantId() != null) {
            Tenant tenant = tenantRepository.findById(request.getTenantId())
                    .orElseThrow(() ->
                            new AppException(ErrorCode.TENANT_NOT_FOUND));

            vehicle.setTenant(tenant);
        }

        tenantVehicleMapper.updateEntity(request, vehicle);

        return tenantVehicleMapper.toResponse(
                tenantVehicleRepository.save(vehicle)
        );
    }

    @Override
    public List<TenantVehicleResponse> getVehiclesByTenantId(Long tenantId) {
        return tenantVehicleRepository.findAllByTenant_IdAndDeletedFalse(tenantId)
                .stream()
                .map(tenantVehicleMapper::toResponse)
                .toList();
    }

    @Override
    public void deleteVehicle(Long vehicleId) {
        TenantVehicle vehicle = findVehicleById(vehicleId);

        // Xóa mềm
        vehicle.setDeleted(true);

        tenantVehicleRepository.save(vehicle);
    }

    @Override
    public List<TenantOptionResponse> getAvailableTenants(String keyword) {
        return tenantRepository
                .findTenantsForVehicleRegistration(keyword)
                .stream()
                .map(tenant -> TenantOptionResponse.builder()
                        .id(tenant.getId())
                        .fullName(tenant.getFullName())
                        .phone(tenant.getPhone())
                        .build())
                .toList();
    }

    private TenantVehicle findVehicleById(Long vehicleId) {
        return tenantVehicleRepository
                .findByIdAndDeletedFalse(vehicleId)
                .orElseThrow(() ->
                        new AppException(
                                ErrorCode.TENANT_VEHICLE_NOT_FOUND
                        ));
    }
}
