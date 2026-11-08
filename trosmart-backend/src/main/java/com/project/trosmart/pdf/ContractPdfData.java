package com.project.trosmart.pdf;

import lombok.Builder;
import lombok.Value;

import java.util.List;

/**
 * Dữ liệu đã định dạng sẵn (chuỗi) để điền vào mẫu hợp đồng.
 * Chỗ nào chưa có thông tin sẽ là dấu chấm "………" để người dùng viết tay sau khi in.
 * Dùng @Value (getter kiểu getX) để Thymeleaf đọc được bằng ${c.x}.
 */
@Value
@Builder
public class ContractPdfData {

    // Tiêu đề
    String contractCode;
    // Dòng cảnh báo đầu trang (bản nháp, đã chấm dứt), null nếu hợp đồng đang hiệu lực
    String banner;

    // Nơi và ngày lập hợp đồng
    String signPlace;
    String signDay;
    String signMonth;
    String signYear;

    // Hai bên
    Party landlord;
    Party tenant;

    // Phòng thuê
    String roomNumber;
    String floor;
    String area;
    String maxOccupancy;
    String buildingName;
    String buildingAddress;

    // Thời hạn
    String startDate;
    String endDate;
    String duration;

    // Tiền
    String rentPrice;
    String rentPriceWords;
    String deposit;
    String depositWords;

    List<CoTenantRow> coTenants;
    List<ServiceRow> services;

    // Ghi chú của hợp đồng, null nếu không có
    String notes;

    @Value
    @Builder
    public static class Party {
        String fullName;
        String birthDate;
        String identityNumber;
        String identityIssuedDate;
        String identityIssuedPlace;
        String phone;
        String address;
    }

    @Value
    @Builder
    public static class CoTenantRow {
        int index;
        String fullName;
        String identityNumber;
        String phone;
        String moveInDate;
    }

    @Value
    @Builder
    public static class ServiceRow {
        int index;
        String name;
        String unit;
        String unitPrice;
    }
}
