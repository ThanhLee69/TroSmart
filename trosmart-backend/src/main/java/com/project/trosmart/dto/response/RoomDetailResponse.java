package com.project.trosmart.dto.response;

import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.RoomType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Dữ liệu đầy đủ cho trang chi tiết phòng. */
@Getter
@Setter
@Builder
public class RoomDetailResponse {

    // ===== Thông tin phòng =====
    private Long id;
    private String roomNumber;
    private RoomType roomType;
    private Integer floor;
    private BigDecimal area;
    private BigDecimal rentalPrice;
    private Integer maxOccupancy;
    private RoomStatus status;
    private String description;
    private Long buildingId;
    private String buildingName;
    private List<AmenitySummaryResponse> amenities;
    private List<RoomImageResponse> images;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // ===== Thông tin liên quan =====
    // Hợp đồng đang hiệu lực (null nếu phòng không có người thuê)
    private ContractInfo currentContract;
    // Hợp đồng gần nhất đã kết thúc (dùng khi phòng trống)
    private ContractInfo lastContract;
    // Người đang ở trong hợp đồng hiện tại
    private List<TenantInfo> currentTenants;
    // Chỉ số điện nước gần nhất đã ghi
    private MeterInfo latestMeterReading;
    // Hóa đơn gần đây (mới nhất trước)
    private List<InvoiceInfo> recentInvoices;
    // Tổng tiền còn nợ của phòng
    private BigDecimal unpaidTotal;
    // Yêu cầu sửa chữa gần đây
    private List<IssueInfo> recentIssues;

    @Getter
    @Builder
    public static class ContractInfo {
        private Long id;
        private String contractCode;
        private LocalDate startDate;
        private LocalDate endDate;
        private LocalDate actualEndDate;
        private BigDecimal rentPrice;
        private BigDecimal deposit;
        private Integer paymentDueDay;
    }

    @Getter
    @Builder
    public static class TenantInfo {
        private Long id;
        private String fullName;
        private String phone;
        private Boolean isPrimary;
        private LocalDate moveInDate;
    }

    @Getter
    @Builder
    public static class MeterInfo {
        private Integer billingMonth;
        private Integer billingYear;
        private BigDecimal electricityStart;
        private BigDecimal electricityEnd;
        private BigDecimal waterStart;
        private BigDecimal waterEnd;
        private LocalDate recordedDate;
    }

    @Getter
    @Builder
    public static class InvoiceInfo {
        private Long id;
        private String invoiceCode;
        private Integer billingMonth;
        private Integer billingYear;
        private BigDecimal totalAmount;
        private BigDecimal remainingAmount;
        private String status;
        private LocalDate dueDate;
    }

    @Getter
    @Builder
    public static class IssueInfo {
        private Long id;
        private String title;
        private String status;
        private String tenantName;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}