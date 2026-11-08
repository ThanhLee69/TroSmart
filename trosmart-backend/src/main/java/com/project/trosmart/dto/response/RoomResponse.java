package com.project.trosmart.dto.response;

import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.RoomType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Dữ liệu phòng cho BẢNG danh sách (gọn nhẹ).
 * Chi tiết đầy đủ nằm ở RoomDetailResponse.
 */
@Getter
@Builder
public class RoomResponse {

    private Long id;

    private String roomNumber;

    private RoomType roomType;

    private Integer floor;

    private BigDecimal area;

    private BigDecimal rentalPrice;

    private Integer maxOccupancy;

    private RoomStatus status;

    private Long buildingId;

    private String buildingName;

    // Ảnh đại diện hiển thị ở bảng
    private String thumbnailUrl;
}