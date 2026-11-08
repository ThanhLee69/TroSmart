package com.project.trosmart.repository;

import com.project.trosmart.entity.Tenant;
import com.project.trosmart.enums.TenantRentalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    Optional<Tenant> findByUser_UsernameAndDeletedFalse(String username);

    @Query("SELECT t.id FROM Tenant t WHERE t.user.username = :username AND t.deleted = false")
    Optional<Long> findIdByUsername(@Param("username") String username);

    @Query("""
            SELECT t
            FROM Tenant t
            WHERE t.deleted = false
              AND (
                  :keyword IS NULL
                  OR TRIM(:keyword) = ''
                  OR LOWER(t.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  OR t.phone LIKE CONCAT('%', :keyword, '%')
                  OR t.identityNumber LIKE CONCAT('%', :keyword, '%')
              )
              AND (
                  :rentalStatus IS NULL
                  OR t.rentalStatus = :rentalStatus
              )
            """)
    Page<Tenant> searchTenant(
            @Param("keyword") String keyword,
            @Param("rentalStatus") TenantRentalStatus rentalStatus,
            Pageable pageable
    );

    Optional<Tenant> findByIdAndDeletedFalse(Long id);

    boolean existsByPhoneAndDeletedFalse(String phone);

    boolean existsByPhoneAndIdNotAndDeletedFalse(
            String phone,
            Long id
    );

    boolean existsByIdentityNumberAndDeletedFalse(String identityNumber);

    boolean existsByIdentityNumberAndIdNotAndDeletedFalse(
            String identityNumber,
            Long id
    );

    long countByDeletedFalse();

    long countByDeletedFalseAndUserIsNull();

    @Query("""
            SELECT t
            FROM Tenant t
            WHERE t.deleted = false
              AND (
                  t.rentalStatus IS NULL
                  OR t.rentalStatus <> TenantRentalStatus.RENTING
              )
              AND (
                  :keyword IS NULL
                  OR TRIM(:keyword) = ''
                  OR LOWER(t.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  OR t.phone LIKE CONCAT('%', :keyword, '%')
              )
            ORDER BY t.fullName ASC
            """)
    List<Tenant> findTenantOptions(
            @Param("keyword") String keyword
    );

    @Query("""
            SELECT t
            FROM Tenant t
            WHERE t.deleted = false
              AND t.user IS NOT NULL
              AND t.rentalStatus = com.project.trosmart.enums.TenantRentalStatus.RENTING
              AND (LOWER(t.fullName) LIKE :keyword ESCAPE '\\'
                   OR t.phone LIKE :keyword ESCAPE '\\')
            ORDER BY t.fullName ASC, t.id ASC
            """)
    List<Tenant> findRentingTenantOptions(
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
            SELECT t
            FROM Tenant t
            WHERE t.deleted = false
              AND (
                  :keyword IS NULL
                  OR TRIM(:keyword) = ''
                  OR LOWER(t.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                  OR t.phone LIKE CONCAT('%', :keyword, '%')
              )
            ORDER BY t.fullName ASC, t.id ASC
            """)
    List<Tenant> findTenantsForVehicleRegistration(
            @Param("keyword") String keyword
    );

    long countByDeletedFalseAndRentalStatus(
            TenantRentalStatus rentalStatus
    );


    @Query("""
            SELECT t FROM Tenant t
            WHERE t.user.username = :username
              AND t.deleted = false
            """)
    Optional<Tenant> findByUsername(@Param("username") String username);
}