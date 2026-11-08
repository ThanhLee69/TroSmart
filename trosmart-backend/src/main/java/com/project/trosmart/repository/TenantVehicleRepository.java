
        package com.project.trosmart.repository;

import com.project.trosmart.entity.TenantVehicle;
import com.project.trosmart.enums.VehicleType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantVehicleRepository
        extends JpaRepository<TenantVehicle, Long> {

    /**
     * Tìm kiếm, lọc và phân trang phương tiện.
     *
     * tenantId: lọc theo khách thuê
     * keyword: tìm theo biển số, hãng xe, màu xe
     * vehicleType: lọc theo loại phương tiện
     */
    @Query("""
    SELECT v
    FROM TenantVehicle v
    WHERE v.deleted = false
      AND (:tenantId IS NULL OR v.tenant.id = :tenantId)
      AND (:keyword IS NULL OR :keyword = ''
          OR LOWER(COALESCE(v.licensePlate, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
          OR LOWER(COALESCE(v.brand, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
          OR LOWER(COALESCE(v.color, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
      AND (:vehicleType IS NULL OR v.vehicleType = :vehicleType)
    """)
    Page<TenantVehicle> searchVehicles(
            @Param("tenantId") Long tenantId,
            @Param("keyword") String keyword,
            @Param("vehicleType") VehicleType vehicleType,
            Pageable pageable
    );
    Optional<TenantVehicle> findByIdAndDeletedFalse(Long id);

    boolean existsByLicensePlateIgnoreCaseAndDeletedFalse(
            String licensePlate
    );

    List<TenantVehicle> findAllByTenant_IdAndDeletedFalse(Long tenantId);

    @Query("""
        SELECT COUNT(DISTINCT tv.id)
        FROM TenantVehicle tv
        JOIN ContractTenant ct ON ct.tenant.id = tv.tenant.id
        WHERE ct.contract.id = :contractId
          AND ct.deleted = false
          AND tv.deleted = false
    """)
    long countVehiclesByContractId(
            @Param("contractId") Long contractId
    );

    // ============ TenantVehicleRepository ============
    List<TenantVehicle> findByTenantIdAndDeletedFalse(Long tenantId);
}
