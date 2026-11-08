package com.project.trosmart.dto.response;

import com.project.trosmart.enums.Gender;
import com.project.trosmart.enums.TenantRentalStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantResponse {

    private Long id;
    private String fullName;
    private String phone;
    private String email;

    private String identityNumber;
    private LocalDate identityIssuedDate;
    private String identityFrontImage;
    private String identityBackImage;

    private LocalDate dateOfBirth;
    private Gender gender;
    private String permanentAddress;
    private String occupation;
    private String note;

    private Long userId;

    // Thông tin thuê được xác định từ hợp đồng
    private TenantRentalStatus rentalStatus;
    private String buildingName;
    private String roomNumber;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}