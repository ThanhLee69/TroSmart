
package com.project.trosmart.repository;

import com.project.trosmart.entity.Contract;
import com.project.trosmart.enums.ContractStatus;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ContractRepository extends JpaRepository<Contract, Long> {


    boolean existsByRoomIdAndDeletedFalseAndStatusIn(
            Long roomId,
            Collection<ContractStatus> statuses
    );
    @Query("""
    SELECT c FROM Contract c
    WHERE c.room.id = :roomId AND c.deleted = false
      AND c.status = com.project.trosmart.enums.ContractStatus.ACTIVE
    """)
    Optional<Contract> findActiveByRoomId(@Param("roomId") Long roomId);
    // Tìm hợp đồng theo ID, chưa bị xóa mềm
    Optional<Contract> findByIdAndDeletedFalse(Long id);

    // Kiểm tra mã hợp đồng đã tồn tại
    boolean existsByContractCode(String contractCode);

    long countByContractCodeStartingWith(String prefix);

    // Lấy danh sách hợp đồng theo trạng thái
    List<Contract> findByStatusAndDeletedFalse(ContractStatus status);

    // Tìm kiếm và lọc hợp đồng
    @Query("""
        SELECT c FROM Contract c
        JOIN c.room r
        JOIN r.building b
        WHERE c.deleted = false
          AND (
              :keyword IS NULL
              OR LOWER(c.contractCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(r.roomNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
          AND (:status IS NULL OR c.status = :status)
          AND (:buildingId IS NULL OR b.id = :buildingId)
        """)
    Page<Contract> searchContracts(
            @Param("keyword") String keyword,
            @Param("status") ContractStatus status,
            @Param("buildingId") Long buildingId,
            Pageable pageable
    );

    // Lấy hợp đồng nháp đã đến ngày bắt đầu
    List<Contract> findByStatusAndStartDateLessThanEqualAndDeletedFalse(
            ContractStatus status,
            LocalDate date
    );

    // Lấy hợp đồng đã đến ngày kết thúc
    List<Contract> findByStatusAndEndDateLessThanAndDeletedFalse(
            ContractStatus status,
            LocalDate date
    );

    // Kiểm tra phòng có hợp đồng ACTIVE hoặc DRAFT trùng thời gian
    @Query("""
        SELECT COUNT(c) > 0
        FROM Contract c
        WHERE c.deleted = false
          AND c.room.id = :roomId
          AND c.status IN :statuses
          AND (:excludeContractId IS NULL OR c.id <> :excludeContractId)
          AND c.startDate <= :endDate
          AND c.endDate >= :startDate
        """)
    boolean existsOverlappingContract(
            @Param("roomId") Long roomId,
            @Param("statuses") List<ContractStatus> statuses,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeContractId") Long excludeContractId
    );

    // Kiểm tra khách thuê có hợp đồng ACTIVE hoặc DRAFT trùng thời gian
    @Query("""
        SELECT COUNT(ct) > 0
        FROM ContractTenant ct
        JOIN ct.contract c
        WHERE c.deleted = false
          AND ct.deleted = false
          AND ct.tenant.id = :tenantId
          AND ct.moveOutDate IS NULL
          AND c.status IN :statuses
          AND (:excludeContractId IS NULL OR c.id <> :excludeContractId)
          AND c.startDate <= :endDate
          AND c.endDate >= :startDate
        """)
    boolean existsOverlappingTenantContract(
            @Param("tenantId") Long tenantId,
            @Param("statuses") List<ContractStatus> statuses,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeContractId") Long excludeContractId
    );

    // Lấy hợp đồng theo trạng thái để hiển thị trong Select
    @Query("""
        SELECT c FROM Contract c
        JOIN FETCH c.room r
        JOIN FETCH r.building b
        WHERE c.deleted = false
          AND c.status = :status
          AND (
              :keyword IS NULL
              OR LOWER(c.contractCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(r.roomNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
        ORDER BY c.startDate DESC
        """)
    List<Contract> findContractOptions(
            @Param("status") ContractStatus status,
            @Param("keyword") String keyword
    );

    // Hợp đồng nháp đã đến ngày bắt đầu
    @Query("""
        SELECT c
        FROM Contract c
        WHERE c.deleted = false
          AND c.status = :status
          AND c.startDate <= :today
        """)
    List<Contract> findContractsToActivate(
            @Param("status") ContractStatus status,
            @Param("today") LocalDate today
    );

    // Hợp đồng đang hiệu lực đã hết hạn
    @Query("""
        SELECT c
        FROM Contract c
        WHERE c.deleted = false
          AND c.status = :status
          AND c.endDate < :today
        """)
    List<Contract> findContractsToExpire(
            @Param("status") ContractStatus status,
            @Param("today") LocalDate today
    );

    // Hợp đồng hết hạn đúng ngày cần nhắc
    @Query("""
        SELECT c
        FROM Contract c
        WHERE c.deleted = false
          AND c.status = :status
          AND c.endDate = :expirationDate
        """)
    List<Contract> findContractsToRemind(
            @Param("status") ContractStatus status,
            @Param("expirationDate") LocalDate expirationDate
    );

    // Tổng số hợp đồng chưa bị xóa mềm
    long countByDeletedFalse();

    // Đếm hợp đồng theo trạng thái
    long countByStatusAndDeletedFalse(ContractStatus status);

    // Đếm hợp đồng sắp hết hạn trong khoảng ngày chỉ định
    @Query("""
    SELECT COUNT(c)
    FROM Contract c
    WHERE c.deleted = false
      AND c.status = :status
      AND c.endDate >= :today
      AND c.endDate <= :endDate
    """)
    long countExpiringContracts(
            @Param("status") ContractStatus status,
            @Param("today") LocalDate today,
            @Param("endDate") LocalDate endDate
    );


    // Khóa hợp đồng khi lập hóa đơn để 2 người không lập trùng một kỳ
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT c
        FROM Contract c
        WHERE c.id = :id
          AND c.deleted = false
        """)
    Optional<Contract> findByIdForUpdate(@Param("id") Long id);

    // Hợp đồng có thể lập hóa đơn trong kỳ:
    // đúng trạng thái, thời hạn có giao với kỳ, chưa có hóa đơn nào chưa hủy
    @Query("""
        SELECT c
        FROM Contract c
        JOIN FETCH c.room r
        JOIN FETCH r.building b
        WHERE c.deleted = false
          AND r.deleted = false
          AND b.deleted = false
          AND c.status = :status
          AND c.startDate <= :periodEnd
          AND c.endDate >= :periodStart
          AND NOT EXISTS (
              SELECT 1 FROM Invoice i
              WHERE i.contract = c
                AND i.deleted = false
                AND i.billingMonth = :billingMonth
                AND i.billingYear = :billingYear
                AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED)
        ORDER BY b.name ASC, r.roomNumber ASC
        """)
    List<Contract> findContractsAvailableForInvoice(
            @Param("status") ContractStatus status,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd
    );


    // ============ ContractRepository ============
// Hợp đồng theo trạng thái mà khách đang ở (chưa chuyển đi)
    @Query("""
        SELECT DISTINCT c FROM Contract c
        JOIN FETCH c.room r
        JOIN FETCH r.building
        JOIN c.contractTenants ct
        WHERE c.deleted = false
          AND ct.deleted = false
          AND ct.moveOutDate IS NULL
          AND ct.tenant.id = :tenantId
          AND c.status = :status
        ORDER BY c.startDate DESC
        """)
    List<Contract> findByTenantAndStatus(
            @Param("tenantId") Long tenantId,
            @Param("status") ContractStatus status
    );
    @Query("""
        SELECT DISTINCT c
        FROM Contract c
        LEFT JOIN FETCH c.contractTenants ct
        LEFT JOIN FETCH ct.tenant
        WHERE c.room.id = :roomId
          AND c.status = :status
          AND c.deleted = false
        ORDER BY c.startDate DESC
        """)
    List<Contract> findByRoomIdAndStatusWithTenants(
            @Param("roomId") Long roomId,
            @Param("status") ContractStatus status
    );

    // Hợp đồng gần nhất đã kết thúc của phòng
    Optional<Contract> findFirstByRoom_IdAndStatusInAndDeletedFalseOrderByEndDateDesc(
            Long roomId,
            Collection<ContractStatus> statuses
    );

    boolean existsByRoom_IdAndStatusAndDeletedFalse(Long roomId, ContractStatus status);
}
