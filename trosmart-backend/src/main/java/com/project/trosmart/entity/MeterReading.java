package com.project.trosmart.entity;

import com.project.trosmart.enums.MeterReadingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "meter_readings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeterReading extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Phòng có công tơ điện và nước
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    // Tháng và năm tính tiền
    @Column(name = "billing_month", nullable = false)
    private Integer billingMonth;

    @Column(name = "billing_year", nullable = false)
    private Integer billingYear;

    // Chỉ số điện
    @Column(name = "electricity_start", nullable = false, precision = 12, scale = 2)
    private BigDecimal electricityStart;

    @Column(name = "electricity_end", precision = 12, scale = 2)
    private BigDecimal electricityEnd;

    // Chỉ số nước
    @Column(name = "water_start", nullable = false, precision = 12, scale = 2)
    private BigDecimal waterStart;

    @Column(name = "water_end", precision = 12, scale = 2)
    private BigDecimal waterEnd;

    // Ngày ghi chỉ số cuối kỳ
    @Column(name = "recorded_date")
    private LocalDate recordedDate;

    // Trạng thái chốt chỉ số
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private MeterReadingStatus status = MeterReadingStatus.NOT_RECORDED;

    // Ảnh công tơ (nếu có)
    @Column(name = "electricity_image_url", length = 500)
    private String electricityImageUrl;

    @Column(name = "water_image_url", length = 500)
    private String waterImageUrl;

    @Column(name = "note", length = 300)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id")   // để null được cho dữ liệu cũ, backfill xong thì đổi nullable = false
    private Contract contract;

    // Lượng điện tiêu thụ
    public BigDecimal getElectricityConsumption() {
        if (electricityEnd == null || electricityStart == null) {
            return BigDecimal.ZERO;
        }
        return electricityEnd.subtract(electricityStart);
    }

    // Lượng nước tiêu thụ
    public BigDecimal getWaterConsumption() {
        if (waterEnd == null || waterStart == null) {
            return BigDecimal.ZERO;
        }
        return waterEnd.subtract(waterStart);
    }

}