package com.project.trosmart.service;

import com.project.trosmart.dto.request.AmenityRequest;
import com.project.trosmart.dto.response.AmenityResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.AmenityScope;

import java.util.List;

public interface AmenityService {

    // Tạo tiện nghi
    AmenityResponse createAmenity(AmenityRequest request);

    // Lấy chi tiết tiện nghi
    AmenityResponse getAmenityById(Long id);

    // Cập nhật tiện nghi
    AmenityResponse updateAmenity(Long id, AmenityRequest request);

    // Lấy danh sách tiện nghi có phân trang
    PageResponse<AmenityResponse> getAmenities(
            String keyword,
            AmenityScope scope,
            int page,
            int size
    );

    // Lấy tiện nghi theo phạm vi: BUILDING hoặc ROOM
    List<AmenityResponse> getBuildingAmenities();

    List<AmenityResponse> getRoomAmenities();

    // Xóa mềm tiện nghi
    void deleteAmenity(Long id);
}