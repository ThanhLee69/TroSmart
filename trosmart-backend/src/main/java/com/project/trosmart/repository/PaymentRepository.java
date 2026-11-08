package com.project.trosmart.repository;

import com.project.trosmart.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Lịch sử thanh toán của hóa đơn, mới nhất trước
    List<Payment> findByInvoice_IdAndDeletedFalseOrderByPaymentDateDescIdDesc(Long invoiceId);

    // Thanh toán thuộc đúng hóa đơn đó và chưa bị xóa
    Optional<Payment> findByIdAndInvoice_IdAndDeletedFalse(Long id, Long invoiceId);

    boolean existsByInvoice_IdAndDeletedFalse(Long invoiceId);

    // Mã giao dịch đã được dùng chưa
    boolean existsByTransactionCodeAndDeletedFalse(String transactionCode);

    // Tổng đã thanh toán của hóa đơn (không tính thanh toán đã xóa); null nếu chưa có
    @Query("""
        SELECT SUM(p.amount)
        FROM Payment p
        WHERE p.invoice.id = :invoiceId
          AND p.deleted = false
        """)
    BigDecimal sumAmountByInvoiceId(@Param("invoiceId") Long invoiceId);

    // ============ PaymentRepository ============
    List<Payment> findByInvoiceIdAndDeletedFalseOrderByPaymentDateDesc(Long invoiceId);

}
