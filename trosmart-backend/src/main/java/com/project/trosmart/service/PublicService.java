package com.project.trosmart.service;

import com.project.trosmart.dto.request.ContactRequest;
import com.project.trosmart.dto.request.PublicRoomSearchRequest;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.PublicRoomDetailResponse;
import com.project.trosmart.dto.response.PublicRoomResponse;

import java.util.List;

public interface PublicService {

    // Các chức năng dành cho khách (trang public).
    // Danh sách phòng còn trống, có phân trang
    PageResponse<PublicRoomResponse> getAvailableRooms(int page, int size);


    PublicRoomDetailResponse getAvailableRoomDetail(Long id);


    List<PublicRoomResponse> getSimilarRooms(Long roomId, int limit);

    // Khách gửi liên hệ (đã qua các lớp chống spam)
    void createContact(ContactRequest request, String clientIp);


    PageResponse<PublicRoomResponse> searchAvailableRooms(PublicRoomSearchRequest request);


    List<String> getAmenityNames();
}