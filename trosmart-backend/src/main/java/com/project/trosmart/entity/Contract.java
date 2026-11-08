
package com.project.trosmart.entity;

import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.PaymentCycle;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "contracts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Contract extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_code", nullable = false, unique = true, length = 50)
    String contractCode;

    // Phòng được thuê
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    Room room;

    // Ngày bắt đầu hợp đồng
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    // Ngày kết thúc hợp đồng;
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    // Tiền thuê phòng được chốt trong hợp đồng
    @Column(name = "rent_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal rentPrice;

    // Tiền đặt cọc
    @Column(name = "deposit", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal deposit = BigDecimal.ZERO;

    // Ngày thanh toán tiền phòng trong tháng

    @Column(name = "payment_due_day", nullable = false)
    Integer paymentDueDay;

    // Chu kỳ thanh toán
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_cycle", nullable = false, length = 20)
    private PaymentCycle paymentCycle;

    // Ghi chú hợp đồng
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Trạng thái hợp đồng do backend quản lý
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ContractStatus status = ContractStatus.DRAFT;

    //Ngày kết thúc thực tế
    @Column(name = "actual_end_date")
    LocalDate actualEndDate;

    //Lý do chấm dứt
    @Column(name = "termination_reason", columnDefinition = "TEXT")
    String terminationReason;

    // Danh sách người thuê trong hợp đồng, bao gồm cả khách thuê chính
    @Builder.Default
    @OneToMany(
            mappedBy = "contract",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<ContractTenant> contractTenants = new ArrayList<>();

    // Danh sách dịch vụ áp dụng cho hợp đồng
    @Builder.Default
    @OneToMany(
            mappedBy = "contract",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<ContractServiceItem> contractServices = new ArrayList<>();
}
