
        package com.project.trosmart.repository;

import com.project.trosmart.entity.ContractTenant;
import com.project.trosmart.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractTenantRepository
        extends JpaRepository<ContractTenant, Long> {
    @Query("""
    SELECT ct FROM ContractTenant ct
    JOIN FETCH ct.contract c
    JOIN FETCH c.room r
    LEFT JOIN FETCH r.building
    WHERE ct.tenant.id = :tenantId
      AND c.deleted = false
    ORDER BY c.startDate DESC, c.id DESC
    """)
    List<ContractTenant> findHistoryByTenantId(@Param("tenantId") Long tenantId);

    // Hợp đồng hiện đang có hiệu lực của khách thuê
    @Query("""
        SELECT ct
        FROM ContractTenant ct
        JOIN FETCH ct.contract c
        JOIN FETCH c.room r
        JOIN FETCH r.building b
        WHERE ct.tenant.id = :tenantId
          AND ct.deleted = false
          AND ct.moveOutDate IS NULL
          AND ct.tenant.deleted = false
          AND c.deleted = false
          AND r.deleted = false
          AND b.deleted = false
          AND c.status = :status
          AND c.startDate <= CURRENT_DATE
          AND (c.endDate IS NULL OR c.endDate >= CURRENT_DATE)
        ORDER BY c.startDate DESC
    """)
    List<ContractTenant> findCurrentContractsByTenant(
            @Param("tenantId") Long tenantId,
            @Param("status") ContractStatus status
    );

    // Tìm người thuê đại diện hiện tại của hợp đồng
    @Query("""
        SELECT ct
        FROM ContractTenant ct
        JOIN FETCH ct.tenant t
        WHERE ct.contract.id = :contractId
          AND ct.deleted = false
          AND ct.moveOutDate IS NULL
          AND ct.isPrimary = true
          AND t.deleted = false
    """)
    Optional<ContractTenant> findPrimaryTenantByContractId(
            @Param("contractId") Long contractId
    );

    // Lấy danh sách người thuê hiện tại của hợp đồng
    @Query("""
        SELECT ct
        FROM ContractTenant ct
        JOIN FETCH ct.tenant t
        WHERE ct.contract.id = :contractId
          AND ct.deleted = false
          AND ct.moveOutDate IS NULL
          AND t.deleted = false
        ORDER BY ct.isPrimary DESC, t.id ASC
    """)
    List<ContractTenant> findCurrentTenantsByContractId(
            @Param("contractId") Long contractId
    );

    // Kiểm tra khách đã từng có hợp đồng kết thúc
    @Query("""
        SELECT CASE WHEN COUNT(ct) > 0 THEN true ELSE false END
        FROM ContractTenant ct
        JOIN ct.contract c
        WHERE ct.tenant.id = :tenantId
          AND ct.deleted = false
          AND c.deleted = false
          AND (
              ct.moveOutDate IS NOT NULL
              OR c.status IN (
                  com.project.trosmart.enums.ContractStatus.EXPIRED,
                  com.project.trosmart.enums.ContractStatus.TERMINATED
              )
              OR (
                  c.status = com.project.trosmart.enums.ContractStatus.ACTIVE
                  AND c.endDate IS NOT NULL
                  AND c.endDate < CURRENT_DATE
              )
          )
    """)
    boolean hasPreviousContract(
            @Param("tenantId") Long tenantId
    );

    // Không cho xóa khách thuê đang có hợp đồng hiệu lực
    @Query("""
        SELECT CASE WHEN COUNT(ct) > 0 THEN true ELSE false END
        FROM ContractTenant ct
        JOIN ct.contract c
        WHERE ct.tenant.id = :tenantId
          AND ct.deleted = false
          AND ct.moveOutDate IS NULL
          AND c.deleted = false
          AND c.status = com.project.trosmart.enums.ContractStatus.ACTIVE
          AND c.startDate <= CURRENT_DATE
          AND (c.endDate IS NULL OR c.endDate >= CURRENT_DATE)
    """)
    boolean hasCurrentContract(
            @Param("tenantId") Long tenantId
    );

    // Kiểm tra khách thuê đã thuộc hợp đồng chưa
    boolean existsByContractIdAndTenantIdAndDeletedFalse(
            Long contractId,
            Long tenantId
    );

    // Lấy các bản ghi người thuê thuộc hợp đồng
    List<ContractTenant> findByContractIdAndDeletedFalse(
            Long contractId
    );

    // Tìm liên kết người thuê - hợp đồng
    Optional<ContractTenant> findByContractIdAndTenantIdAndDeletedFalse(
            Long contractId,
            Long tenantId
    );

}
