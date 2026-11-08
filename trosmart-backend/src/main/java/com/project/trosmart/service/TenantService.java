package com.project.trosmart.service;

import com.project.trosmart.dto.request.TenantRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.TenantRentalStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TenantService {

    // Thêm khách thuê
    TenantResponse createTenant(TenantRequest request);

    // Cập nhật khách thuê
    TenantResponse updateTenant(Long id, TenantRequest request);

    // Xem chi tiết khách thuê
    TenantResponse getTenantById(Long id);

    // Tìm kiếm khách thuê có phân trang
    // Tìm kiếm khách thuê có phân trang
    PageResponse<TenantResponse> searchTenants(
            String keyword,
            TenantRentalStatus rentalStatus,
            int page,
            int size
    );

    // Xóa mềm khách thuê
    void deleteTenant(Long id);

    // Thống kê khách thuê
    TenantDashboardResponse getTenantDashboard();

    // Danh sách khách thuê để chọn khi tạo hợp đồng
    List<TenantOptionResponse> getTenantOptions(String keyword);

    // Cập nhật ảnh CCCD riêng
    TenantResponse updateIdentityImages(
            Long id,
            MultipartFile frontImage,
            MultipartFile backImage
    );

    List<TenantContractHistoryResponse> getTenantContracts(Long tenantId);
}