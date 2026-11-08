package com.project.trosmart.pdf;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Thông tin Bên A (chủ trọ) in trên hợp đồng, khai báo trong application.yml:
 *
 * app:
 *   contract:
 *     landlord:
 *       full-name: Nguyễn Văn A
 *       birth-date: 01/01/1980
 *       identity-number: 001080000000
 *       identity-issued-date: 01/01/2021
 *       identity-issued-place: Cục Cảnh sát QLHC về TTXH
 *       phone: 0369 958 572
 *       address: Số 1, đường ABC, phường XYZ, Hà Nội
 *
 * Trường nào bỏ trống sẽ in dấu chấm để viết tay.
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.contract.landlord")
public class ContractPdfProperties {

    private String fullName;
    private String birthDate;
    private String identityNumber;
    private String identityIssuedDate;
    private String identityIssuedPlace;
    private String phone;
    private String address;
}
