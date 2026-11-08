package com.project.trosmart.dto.response;

import com.project.trosmart.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// Dữ liệu phòng trống hiển thị cho khách.
// Cố ý không có: trạng thái, hợp đồng, người thuê, thông tin tạo/sửa.
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicRoomResponse {

    private Long id;
    private String roomNumber;
    private RoomType roomType;
    private Integer maxOccupancy;
    private Integer floor;
    private BigDecimal area;
    private BigDecimal rentalPrice;

    // Ảnh đại diện (null nếu phòng chưa có ảnh)
    private String thumbnailUrl;

    // Thông tin tòa nhà
    private String buildingName;
    private String province;
    private String ward;

    // Khoảng cách (km) tới điểm khách tìm. Chỉ có khi tìm theo vị trí, còn lại null.
    // Không cần trả lat/lng của tòa nhà: khoảng cách đã tính sẵn ở server.
    private Double distanceKm;
}