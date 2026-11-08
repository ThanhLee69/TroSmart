package com.project.trosmart.entity;


import com.project.trosmart.enums.Gender;
import com.project.trosmart.enums.TenantRentalStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone", nullable = false, length = 15)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "identity_number", length = 20, unique = true)
    private String identityNumber;

    @Column(name = "identity_front_image", length = 500)
    private String identityFrontImage;

    @Column(name = "identity_back_image", length = 500)
    private String identityBackImage;

    @Column(name = "identity_issued_date")
    private LocalDate identityIssuedDate;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 20)
    private Gender gender;

    @Column(name = "permanent_address", length = 255)
    private String permanentAddress;

    @Column(name = "occupation", length = 100)
    private String occupation;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "rental_status", nullable = false, length = 20)
    @Builder.Default
    private TenantRentalStatus rentalStatus = TenantRentalStatus.NOT_RENTED;
}