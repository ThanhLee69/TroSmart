package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.ServiceItemRequest;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.ServiceItemResponse;
import com.project.trosmart.entity.ServiceItem;
import com.project.trosmart.enums.BillingType;
import com.project.trosmart.enums.ServiceCode;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.ServiceItemMapper;
import com.project.trosmart.repository.ServiceItemRepository;
import com.project.trosmart.service.ServiceItemService;
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
public class ServiceItemServiceImpl implements ServiceItemService {

    private final ServiceItemRepository serviceItemRepository;
    private final ServiceItemMapper serviceItemMapper;

    @Override
    @Transactional
    public ServiceItemResponse createServiceItem(ServiceItemRequest request) {
        String name = request.getName().trim();

        if (serviceItemRepository.existsByNameIgnoreCaseAndDeletedFalse(name)) {
            throw new AppException(ErrorCode.SERVICE_ITEM_EXISTED);
        }

        ServiceItem serviceItem = serviceItemMapper.toEntity(request);
        serviceItem.setServiceCode(ServiceCode.CUSTOM);

        ServiceItem savedServiceItem = serviceItemRepository.save(serviceItem);

        return serviceItemMapper.toResponse(savedServiceItem);
    }



    @Override
    @Transactional
    public ServiceItemResponse updateServiceItem(
            Long id,
            ServiceItemRequest request
    ) {
        ServiceItem serviceItem = getActiveServiceItem(id);

        String name = request.getName().trim();

        // Dịch vụ hệ thống: chỉ cho phép sửa đơn giá
        if (serviceItem.getServiceCode() != ServiceCode.CUSTOM) {
            serviceItem.setUnitPrice(request.getUnitPrice());

            ServiceItem savedServiceItem = serviceItemRepository.save(serviceItem);

            return serviceItemMapper.toResponse(savedServiceItem);
        }

        // Dịch vụ do chủ trọ tự tạo: cho sửa bình thường
        if (serviceItemRepository
                .existsByNameIgnoreCaseAndDeletedFalseAndIdNot(name, id)) {
            throw new AppException(ErrorCode.SERVICE_ITEM_EXISTED);
        }

        request.setName(name);
        serviceItemMapper.updateEntity(serviceItem, request);

        ServiceItem savedServiceItem = serviceItemRepository.save(serviceItem);

        return serviceItemMapper.toResponse(savedServiceItem);
    }


    @Override
    @Transactional(readOnly = true)
    public ServiceItemResponse getServiceItemById(Long id) {
        ServiceItem serviceItem = getActiveServiceItem(id);
        return serviceItemMapper.toResponse(serviceItem);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ServiceItemResponse> getServiceItems(
            String keyword,
            BillingType billingType,
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

        Page<ServiceItem> result = serviceItemRepository.searchServiceItems(
                normalizedKeyword,
                billingType,
                pageable
        );

        List<ServiceItemResponse> items = result.getContent()
                .stream()
                .map(serviceItemMapper::toResponse)
                .toList();

        return PageResponse.<ServiceItemResponse>builder()
                .items(items)
                .currentPage(result.getNumber() + 1)
                .pageSize(result.getSize())
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceItemResponse> getServiceItemOptions(String keyword) {
        String normalizedKeyword =
                keyword == null || keyword.isBlank()
                        ? null
                        : keyword.trim();

        return serviceItemRepository.findServiceItemOptions(normalizedKeyword)
                .stream()
                .map(serviceItemMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void deleteServiceItem(Long id) {
        ServiceItem serviceItem = getActiveServiceItem(id);
        serviceItem.setDeleted(true);
        serviceItemRepository.save(serviceItem);
    }

    private ServiceItem getActiveServiceItem(Long id) {
        return serviceItemRepository.findById(id)
                .filter(serviceItem ->
                        !Boolean.TRUE.equals(serviceItem.getDeleted()))
                .orElseThrow(() ->
                        new AppException(ErrorCode.SERVICE_ITEM_NOT_FOUND)
                );
    }
}