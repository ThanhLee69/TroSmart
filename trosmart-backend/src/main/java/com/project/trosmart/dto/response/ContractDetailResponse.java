package com.project.trosmart.dto.response;

import com.project.trosmart.enums.BillingType;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.PaymentCycle;
import com.project.trosmart.enums.ServiceCode;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Chi tiết đầy đủ của một hợp đồng (trang chi tiết, form sửa, các thao tác
 * thêm/bớt người ở, dịch vụ, gia hạn, chấm dứt).
 */
@Getter
@Setter
@Builder
public class ContractDetailResponse {

    private Long id;
    private String contractCode;
    private ContractStatus status;

    // Phòng và tòa nhà
    private Long roomId;
    private String roomNumber;
    private Long buildingId;
    private String buildingName;

    // Người đứng tên hợp đồng
    private Long tenantId;
    private String tenantName;
    private String tenantPhone;

    // Thời hạn
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate actualEndDate;

    // Tiền
    private BigDecimal rentPrice;
    private BigDecimal deposit;

    // Thanh toán
    private Integer paymentDueDay;
    private PaymentCycle paymentCycle;

    // Nội dung
    private String notes;
    private String terminationReason;

    // Người thuê: gồm cả người đã chuyển đi (moveOutDate != null)
    private List<TenantItem> contractTenants;

    // Dịch vụ áp dụng
    private List<ServiceItem> contractServices;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @Builder
    public static class TenantItem {
        private Long id;          // id dòng contract_tenants
        private Long tenantId;
        private String fullName;
        private String phone;
        private Boolean isPrimary;
        private LocalDate moveInDate;
        private LocalDate moveOutDate;
        // true = còn đang ở, false = đã chuyển đi
        private Boolean active;
    }

    @Getter
    @Setter
    @Builder
    public static class ServiceItem {
        private Long id;          // id dòng dịch vụ của hợp đồng
        private Long serviceId;   // id trong danh mục dịch vụ
        private ServiceCode serviceCode;
        private String serviceName;
        private String unit;
        private BillingType billingType;
        private BigDecimal unitPrice;
        // false = dịch vụ bắt buộc (điện, nước, mặc định), không được bỏ
        private Boolean removable;
    }
}