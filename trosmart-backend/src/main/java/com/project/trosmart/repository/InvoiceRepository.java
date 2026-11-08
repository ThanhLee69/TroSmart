package com.project.trosmart.repository;

import com.project.trosmart.entity.ContractTenant;
import com.project.trosmart.entity.Invoice;
import com.project.trosmart.enums.InvoiceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    // =========================================================
    // Chi tiết hóa đơn: fetch luôn hợp đồng, phòng, tòa nhà, điện nước, các dòng
    // =========================================================
    @Query("""
        SELECT DISTINCT i
        FROM Invoice i
        JOIN FETCH i.contract c
        JOIN FETCH c.room r
        JOIN FETCH r.building b
        LEFT JOIN FETCH i.meterReading
        LEFT JOIN FETCH i.details
        WHERE i.id = :id
          AND i.deleted = false
        """)
    Optional<Invoice> findActiveById(@Param("id") Long id);

    // =========================================================
    // Khóa dòng hóa đơn khi hủy / thanh toán / xóa thanh toán,
    // tránh 2 request cùng lúc làm sai số tiền
    // =========================================================
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT i
        FROM Invoice i
        WHERE i.id = :id
          AND i.deleted = false
        """)
    Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    boolean existsByIdAndDeletedFalse(Long id);

    // Hợp đồng đã có hóa đơn (chưa hủy) trong kỳ chưa
    boolean existsByContract_IdAndBillingMonthAndBillingYearAndStatusNotAndDeletedFalse(
            Long contractId,
            Integer billingMonth,
            Integer billingYear,
            InvoiceStatus status
    );

    // =========================================================
    // Danh sách hóa đơn (admin)
    // keyword là mẫu LIKE đã chuẩn hóa ở service (chữ thường, đã escape, dạng %abc%)
    // =========================================================
    @Query(
            value = """
        SELECT i
        FROM Invoice i
        JOIN FETCH i.contract c
        JOIN FETCH c.room r
        JOIN FETCH r.building b
        WHERE i.deleted = false
          AND (:buildingId IS NULL OR b.id = :buildingId)
          AND (:billingMonth IS NULL OR i.billingMonth = :billingMonth)
          AND (:billingYear IS NULL OR i.billingYear = :billingYear)
          AND (:status IS NULL OR i.status = :status)
          AND (LOWER(i.invoiceCode) LIKE :keyword ESCAPE '\\'
               OR LOWER(r.roomNumber) LIKE :keyword ESCAPE '\\')
        ORDER BY i.billingYear DESC, i.billingMonth DESC, i.id DESC
        """,
            countQuery = """
        SELECT COUNT(i)
        FROM Invoice i
        JOIN i.contract c
        JOIN c.room r
        JOIN r.building b
        WHERE i.deleted = false
          AND (:buildingId IS NULL OR b.id = :buildingId)
          AND (:billingMonth IS NULL OR i.billingMonth = :billingMonth)
          AND (:billingYear IS NULL OR i.billingYear = :billingYear)
          AND (:status IS NULL OR i.status = :status)
          AND (LOWER(i.invoiceCode) LIKE :keyword ESCAPE '\\'
               OR LOWER(r.roomNumber) LIKE :keyword ESCAPE '\\')
        """
    )
    Page<Invoice> searchInvoices(
            @Param("buildingId") Long buildingId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear,
            @Param("status") InvoiceStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    // =========================================================
    // Thống kê một kỳ (không tính hóa đơn đã hủy)
    // Mỗi dòng: [tổng tiền, đã thu, còn nợ, số hóa đơn, số hóa đơn quá hạn]
    // =========================================================
    @Query("""
        SELECT SUM(i.totalAmount),
               SUM(i.paidAmount),
               SUM(i.remainingAmount),
               COUNT(i),
               SUM(CASE WHEN i.status = com.project.trosmart.enums.InvoiceStatus.OVERDUE
                        THEN 1 ELSE 0 END)
        FROM Invoice i
        JOIN i.contract c
        JOIN c.room r
        JOIN r.building b
        WHERE i.deleted = false
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND i.billingMonth = :billingMonth
          AND i.billingYear = :billingYear
          AND (:buildingId IS NULL OR b.id = :buildingId)
        """)
    List<Object[]> getInvoiceStatistics(
            @Param("buildingId") Long buildingId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear
    );

    // =========================================================
    // Khách đứng tên của nhiều hợp đồng cùng lúc (tránh N+1 khi hiện danh sách)
    // =========================================================
    @Query("""
        SELECT ct
        FROM ContractTenant ct
        JOIN FETCH ct.tenant t
        JOIN FETCH ct.contract c
        WHERE c.id IN :contractIds
          AND ct.isPrimary = true
          AND ct.deleted = false
        """)
    List<ContractTenant> findPrimaryContractTenants(
            @Param("contractIds") Collection<Long> contractIds
    );

    // =========================================================
    // Số lượng tính tiền dịch vụ không có đồng hồ.
    // "Người ở trong kỳ": đã dọn vào trước hết kỳ và chưa dọn ra trước đầu kỳ.
    // =========================================================

    // Số người ở của hợp đồng trong kỳ (dịch vụ tính theo người)
    @Query("""
        SELECT COUNT(ct)
        FROM ContractTenant ct
        WHERE ct.contract.id = :contractId
          AND ct.deleted = false
          AND ct.tenant.deleted = false
          AND ct.moveInDate <= :periodEnd
          AND (ct.moveOutDate IS NULL OR ct.moveOutDate >= :periodStart)
        """)
    long countResidentsOfContract(
            @Param("contractId") Long contractId,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd
    );

    // Số xe đã đăng ký của những người ở trong kỳ (dịch vụ gửi xe)
    @Query("""
        SELECT COUNT(v)
        FROM TenantVehicle v
        WHERE v.deleted = false
          AND v.tenant.id IN (
              SELECT ct.tenant.id
              FROM ContractTenant ct
              WHERE ct.contract.id = :contractId
                AND ct.deleted = false
                AND ct.tenant.deleted = false
                AND ct.moveInDate <= :periodEnd
                AND (ct.moveOutDate IS NULL OR ct.moveOutDate >= :periodStart))
        """)
    long countVehiclesOfContract(
            @Param("contractId") Long contractId,
            @Param("periodStart") LocalDate periodStart,
            @Param("periodEnd") LocalDate periodEnd
    );

    // =========================================================
    // Job quá hạn: còn nợ, qua hạn, chưa đánh dấu OVERDUE
    // =========================================================
    @Query("""
        SELECT i
        FROM Invoice i
        WHERE i.deleted = false
          AND i.status IN :statuses
          AND i.dueDate < :today
          AND i.remainingAmount > 0
        """)
    List<Invoice> findInvoicesToMarkOverdue(
            @Param("statuses") Collection<InvoiceStatus> statuses,
            @Param("today") LocalDate today
    );

    // =========================================================
    // Phía khách thuê: hóa đơn của các hợp đồng mà khách có tên.
    // Ẩn hóa đơn đã hủy.
    // =========================================================
    @Query(
            value = """
        SELECT i
        FROM Invoice i
        JOIN FETCH i.contract c
        JOIN FETCH c.room r
        JOIN FETCH r.building b
        WHERE i.deleted = false
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND (:status IS NULL OR i.status = :status)
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = c
                AND ct.tenant.id = :tenantId
                AND ct.deleted = false)
        ORDER BY i.billingYear DESC, i.billingMonth DESC, i.id DESC
        """,
            countQuery = """
        SELECT COUNT(i)
        FROM Invoice i
        JOIN i.contract c
        WHERE i.deleted = false
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND (:status IS NULL OR i.status = :status)
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = c
                AND ct.tenant.id = :tenantId
                AND ct.deleted = false)
        """
    )
    Page<Invoice> searchTenantInvoices(
            @Param("tenantId") Long tenantId,
            @Param("status") InvoiceStatus status,
            Pageable pageable
    );

    // Khách có được xem hóa đơn này không
    @Query("""
        SELECT COUNT(i) > 0
        FROM Invoice i
        WHERE i.id = :id
          AND i.deleted = false
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = i.contract
                AND ct.tenant.id = :tenantId
                AND ct.deleted = false)
        """)
    boolean existsVisibleToTenant(
            @Param("id") Long id,
            @Param("tenantId") Long tenantId
    );

    // =========================================================
    // Phía khách thuê (dùng cho trang khách): hóa đơn của các hợp đồng
    // mà khách có tên. Luôn ẩn hóa đơn đã hủy.
    // =========================================================

    // Hóa đơn còn phải đóng của khách, hạn gần nhất trước
    @Query("""
        SELECT i FROM Invoice i
        WHERE i.deleted = false
          AND i.status IN :statuses
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = i.contract
                AND ct.deleted = false
                AND ct.tenant.id = :tenantId)
        ORDER BY i.dueDate ASC, i.id ASC
        """)
    List<Invoice> findOpenByTenant(
            @Param("tenantId") Long tenantId,
            @Param("statuses") List<InvoiceStatus> statuses
    );

    // Hóa đơn khách được xem (trừ đã hủy), mới nhất trước
    @Query(value = """
        SELECT i FROM Invoice i
        WHERE i.deleted = false
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = i.contract
                AND ct.deleted = false
                AND ct.tenant.id = :tenantId)
        ORDER BY i.billingYear DESC, i.billingMonth DESC, i.id DESC
        """,
            countQuery = """
        SELECT COUNT(i) FROM Invoice i
        WHERE i.deleted = false
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = i.contract
                AND ct.deleted = false
                AND ct.tenant.id = :tenantId)
        """)
    Page<Invoice> findVisibleByTenant(
            @Param("tenantId") Long tenantId,
            Pageable pageable
    );

    // Chi tiết một hóa đơn của khách (không phải của khách này hoặc đã hủy thì trả rỗng)
    @Query("""
        SELECT i FROM Invoice i
        WHERE i.id = :id
          AND i.deleted = false
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = i.contract
                AND ct.deleted = false
                AND ct.tenant.id = :tenantId)
        """)
    Optional<Invoice> findVisibleByIdAndTenant(
            @Param("id") Long id,
            @Param("tenantId") Long tenantId
    );

    // Danh sách hóa đơn của khách, lọc theo các trạng thái, mới nhất trước
    @Query(value = """
        SELECT i FROM Invoice i
        WHERE i.deleted = false
          AND i.status IN :statuses
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = i.contract
                AND ct.deleted = false
                AND ct.tenant.id = :tenantId)
        ORDER BY i.billingYear DESC, i.billingMonth DESC, i.id DESC
        """,
            countQuery = """
        SELECT COUNT(i) FROM Invoice i
        WHERE i.deleted = false
          AND i.status IN :statuses
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = i.contract
                AND ct.deleted = false
                AND ct.tenant.id = :tenantId)
        """)
    Page<Invoice> findVisibleByTenantAndStatuses(
            @Param("tenantId") Long tenantId,
            @Param("statuses") Collection<InvoiceStatus> statuses,
            Pageable pageable
    );

    // Đếm số hóa đơn của khách theo từng trạng thái (trừ đã hủy)
    @Query("""
        SELECT i.status, COUNT(i) FROM Invoice i
        WHERE i.deleted = false
          AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
          AND EXISTS (
              SELECT 1 FROM ContractTenant ct
              WHERE ct.contract = i.contract
                AND ct.deleted = false
                AND ct.tenant.id = :tenantId)
        GROUP BY i.status
        """)
    List<Object[]> countByTenantGroupByStatus(@Param("tenantId") Long tenantId);

    // Hóa đơn gần đây của phòng (bỏ hóa đơn đã hủy)
    @Query("""
    SELECT i
    FROM Invoice i
    WHERE i.contract.room.id = :roomId
      AND i.deleted = false
      AND i.status <> com.project.trosmart.enums.InvoiceStatus.CANCELLED
    ORDER BY i.billingYear DESC, i.billingMonth DESC, i.id DESC
    """)
    List<Invoice> findRecentByRoomId(
            @Param("roomId") Long roomId,
            Pageable pageable
    );

    // Tổng tiền còn nợ của phòng (giữ nguyên)
    @Query("""
    SELECT COALESCE(SUM(i.remainingAmount), 0)
    FROM Invoice i
    WHERE i.contract.room.id = :roomId
      AND i.deleted = false
      AND i.status IN (
          com.project.trosmart.enums.InvoiceStatus.UNPAID,
          com.project.trosmart.enums.InvoiceStatus.PARTIALLY_PAID,
          com.project.trosmart.enums.InvoiceStatus.OVERDUE)
    """)
    BigDecimal sumUnpaidByRoomId(@Param("roomId") Long roomId);
}