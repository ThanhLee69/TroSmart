package com.project.trosmart.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Số liệu cho trang Tổng quan của admin.
 */
@Getter
@Builder
public class DashboardSummaryResponse {

    private Occupancy occupancy;
    private MonthRevenue month;
    private Debt debt;
    private List<TodoItem> todo;
    private List<BuildingRooms> buildings;
    private List<OverdueInvoice> overdueInvoices;
    private List<ExpiringContract> expiringContracts;

    /** Số phòng theo trạng thái (đã lọc theo tòa nhà nếu có chọn). */
    @Getter
    @Builder
    public static class Occupancy {
        private long total;
        private long rented;
        private long reserved;
        private long available;
        private long maintenance;
    }

    /** Tiền phòng tháng này: phải thu và đã thu. */
    @Getter
    @Builder
    public static class MonthRevenue {
        private BigDecimal collected;
        private BigDecimal expected;
    }

    /** Công nợ: tổng tiền còn phải thu và số hóa đơn quá hạn. */
    @Getter
    @Builder
    public static class Debt {
        private BigDecimal amount;
        private long overdueCount;
    }

    /** Một dòng trong danh sách "Việc cần xử lý". */
    @Getter
    @Builder
    public static class TodoItem {
        private String key;
        private String label;
        private long count;
        // danger | warning | info
        private String tone;
        // trùng tên khóa trong path_name ở frontend
        private String path;
    }

    /** Số phòng theo trạng thái của từng tòa (luôn trả đủ các tòa để làm bộ lọc). */
    @Getter
    @Builder
    public static class BuildingRooms {
        private Long id;
        private String name;
        private long rented;
        private long reserved;
        private long available;
        private long maintenance;
    }

    @Getter
    @Builder
    public static class OverdueInvoice {
        private Long id;
        private String room;
        private String building;
        private String tenant;
        private BigDecimal amount;
        private long days;
    }

    @Getter
    @Builder
    public static class ExpiringContract {
        private Long id;
        private String room;
        private String building;
        private String tenant;
        private LocalDate endDate;
        private long days;
    }
}