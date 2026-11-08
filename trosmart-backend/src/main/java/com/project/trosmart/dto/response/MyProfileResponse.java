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
public class MyProfileResponse {

    // Từ Tenant
    private String fullName;
    private String phone;
    private String email;
    private LocalDate dateOfBirth;
    private Gender gender;
    private String identityNumber;      // đã che: 0010****8821
    private String permanentAddress;
    private String occupation;
    private TenantRentalStatus rentalStatus;

    // Từ User
    private String username;
    private LocalDateTime createdAt;    // "Tham gia từ"

    // Từ hợp đồng đang hiệu lực (null nếu chưa thuê)
    private String roomNumber;
    private String buildingName;
}