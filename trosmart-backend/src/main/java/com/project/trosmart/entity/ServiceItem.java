
package com.project.trosmart.entity;

import com.project.trosmart.enums.ServiceCode;
import com.project.trosmart.enums.BillingType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "service_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_code", length = 20)
    private ServiceCode serviceCode;

    // Tên dịch vụ: Điện, nước, vệ sinh, Wi-Fi...
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    // Đơn giá hiện tại
    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    // Đơn vị tính: kWh, m³, tháng...
    @Column(name = "unit", nullable = false, length = 30)
    private String unit;

    // Cách tính phí dịch vụ
    @Enumerated(EnumType.STRING)
    @Column(name = "billing_type", nullable = false, length = 30)
    private BillingType billingType;

    // Dịch vụ tick sẵn khi tạo hợp đồng (điện, nước)
    @Column(name = "is_default", nullable = false)
    @Builder.Default
    private Boolean defaultService = false;

    // Mô tả dịch vụ
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;


}
