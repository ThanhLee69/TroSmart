package com.project.trosmart.service;

import com.project.trosmart.dto.request.ServiceItemRequest;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.ServiceItemResponse;
import com.project.trosmart.enums.BillingType;

import java.util.List;

public interface ServiceItemService {

    // Tìm kiếm, lọc và phân trang
    PageResponse<ServiceItemResponse> getServiceItems(
            String keyword,
            BillingType billingType,
            int page,
            int size
    );

    // Lấy chi tiết dịch vụ
    ServiceItemResponse getServiceItemById(Long id);

    // Thêm dịch vụ
    ServiceItemResponse createServiceItem(ServiceItemRequest request);

    // Cập nhật dịch vụ
    ServiceItemResponse updateServiceItem(
            Long id,
            ServiceItemRequest request
    );

    // Xóa mềm dịch vụ
    void deleteServiceItem(Long id);

    // Lấy danh sách dịch vụ cho select
    List<ServiceItemResponse> getServiceItemOptions(String keyword);
}