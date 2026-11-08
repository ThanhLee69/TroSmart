package com.project.trosmart.dto.request;

import com.project.trosmart.enums.RoomType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;


@Getter
@Setter
public class PublicRoomSearchRequest {

    // Tên phòng, tên tòa nhà, địa chỉ
    private String keyword;

    private List<RoomType> types;

    // Tên tiện nghi của phòng; phòng phải có đủ tất cả tiện nghi được chọn
    private List<String> amenities;

    private BigDecimal priceMin;
    private BigDecimal priceMax;

    // areaMin: từ (bao gồm), areaMax: đến (không bao gồm)
    private BigDecimal areaMin;
    private BigDecimal areaMax;

    @Min(value = 1, message = "Sức chứa tối thiểu phải lớn hơn hoặc bằng 1")
    private Integer capacityMin;

    // Khu vực: tên tỉnh/thành và phường/xã (lấy từ /public/locations).
    // Không phân biệt hoa thường và tiền tố "Tỉnh", "Thành phố", "Phường", "Xã"
    private String city;
    private String ward;

    // Tìm theo vị trí: cần đủ lat + lng
    @DecimalMin(value = "-90", message = "Vĩ độ không hợp lệ")
    @DecimalMax(value = "90", message = "Vĩ độ không hợp lệ")
    private Double lat;

    @DecimalMin(value = "-180", message = "Kinh độ không hợp lệ")
    @DecimalMax(value = "180", message = "Kinh độ không hợp lệ")
    private Double lng;

    @DecimalMin(value = "0.1", message = "Bán kính tối thiểu là 0,1 km")
    @DecimalMax(value = "50", message = "Bán kính tối đa là 50 km")
    private Double radiusKm;

    // price_asc | price_desc | area_desc | distance
    private String sort;

    @Min(value = 1, message = "Trang phải lớn hơn hoặc bằng 1")
    private int page = 1;

    @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
    @Max(value = 50, message = "Kích thước trang tối đa là 50")
    private int pageSize = 9;

    public boolean hasOrigin() {
        return lat != null && lng != null;
    }
}