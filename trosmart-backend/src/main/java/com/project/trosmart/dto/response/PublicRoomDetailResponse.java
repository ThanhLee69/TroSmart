package com.project.trosmart.dto.response;

import com.project.trosmart.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

// Chi tiết phòng trống hiển thị cho khách.
// Cố ý không có: trạng thái, hợp đồng, người thuê, thông tin tạo/sửa.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicRoomDetailResponse {

    private Long id;
    private String roomNumber;
    private RoomType roomType;
    private Integer maxOccupancy;
    private Integer floor;
    private BigDecimal area;
    private BigDecimal rentalPrice;
    private String description;

    // Ảnh đại diện (null nếu chưa có ảnh) và toàn bộ ảnh, ảnh chính xếp đầu
    private String thumbnailUrl;
    private List<String> imageUrls;

    // Tiện nghi của phòng và của tòa nhà
    private List<String> amenities;
    private List<String> buildingAmenities;

    // Thông tin tòa nhà
    private Long buildingId;
    private String buildingName;
    private String address;
    private String province;
    private String ward;
    private BigDecimal latitude;
    private BigDecimal longitude;
}