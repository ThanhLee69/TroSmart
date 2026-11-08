package com.project.trosmart.service;

import com.project.trosmart.dto.request.RoomRequest;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.RoomDashboardResponse;
import com.project.trosmart.dto.response.RoomDetailResponse;
import com.project.trosmart.dto.response.RoomOptionResponse;
import com.project.trosmart.dto.response.RoomResponse;
import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.RoomType;

import java.util.List;

public interface RoomService {

    PageResponse<RoomResponse> getRooms(
            String keyword,
            Long buildingId,
            RoomType roomType,
            RoomStatus status,
            int page,
            int size
    );

    List<RoomOptionResponse> getRoomOptions(String keyword);

    // Chi tiết đầy đủ cho trang chi tiết phòng
    RoomDetailResponse getRoomById(Long id);

    RoomResponse createRoom(RoomRequest request);

    RoomResponse updateRoom(Long id, RoomRequest request);

    void deleteRoom(Long id);

    RoomResponse updateRoomMaintenance(Long id, boolean enabled);

    RoomDashboardResponse getRoomDashboard(Long buildingId);
}