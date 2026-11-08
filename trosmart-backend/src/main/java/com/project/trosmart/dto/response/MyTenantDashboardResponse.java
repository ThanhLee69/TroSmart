package com.project.trosmart.dto.response;

import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.IssueStatus;
import com.project.trosmart.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Tổng quan của khách thuê đang đăng nhập (trang chủ khách thuê).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyTenantDashboardResponse {

    // Khách
    private String fullName;

    // Phòng
    private String roomNumber;
    private String buildingName;

    // Hợp đồng
    private String contractCode;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    private Long daysToContractEnd;
    private BigDecimal rentPrice;
    private Integer paymentDueDay;

    // Tiền cần đóng
    private BigDecimal amountDue;
    private Long unpaidInvoiceCount;
    private LocalDate dueDate;
    private Long latestInvoiceId;

    // Số đếm
    private Long openIssueCount;
    private Long unreadNotificationCount;

    // Danh sách gần đây (tối đa 3 mục mỗi loại)
    private List<RecentInvoice> recentInvoices;
    private List<RecentNotification> recentNotifications;
    private List<RecentIssue> recentIssues;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentInvoice {
        private Long id;
        private String invoiceCode;
        private Integer billingMonth;
        private Integer billingYear;
        private LocalDate dueDate;
        private BigDecimal totalAmount;
        private BigDecimal remainingAmount;
        private InvoiceStatus status;
        private Boolean overdue;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentNotification {
        private Long id;
        private String title;
        private NotificationType type;
        private LocalDateTime sentAt;
        private Boolean isRead;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentIssue {
        private Long id;
        private String title;
        private IssueStatus status;
        private LocalDateTime createdAt;
    }
}