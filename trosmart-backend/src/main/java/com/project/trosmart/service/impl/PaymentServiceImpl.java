package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.PaymentRequest;
import com.project.trosmart.dto.response.InvoiceDetailResponse;
import com.project.trosmart.dto.response.PaymentResponse;
import com.project.trosmart.entity.Invoice;
import com.project.trosmart.entity.Payment;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.InvoiceMapper;
import com.project.trosmart.repository.InvoiceRepository;
import com.project.trosmart.repository.PaymentRepository;
import com.project.trosmart.service.InvoiceService;
import com.project.trosmart.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static com.project.trosmart.util.CalculationUtils.recalculate;
import static com.project.trosmart.util.CalculationUtils.roundMoney;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentServiceImpl implements PaymentService {

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;
    private final InvoiceMapper invoiceMapper;

    // =========================================================
    // 1. GHI NHẬN THANH TOÁN
    // =========================================================
    @Override
    public InvoiceDetailResponse createPayment(Long invoiceId, PaymentRequest request) {
        if (request == null || request.getAmount() == null) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT);
        }

        // Làm tròn 2 chữ số như cột DB; 0.004 sẽ thành 0 nên bị chặn ở đây
        BigDecimal amount = roundMoney(request.getAmount());
        if (amount.signum() <= 0) {
            throw new AppException(ErrorCode.INVALID_PAYMENT_AMOUNT);
        }

        // Khóa hóa đơn: 2 lần thu tiền cùng lúc không thể làm trả vượt tổng
        Invoice invoice = getInvoiceForUpdate(invoiceId);
        requirePayable(invoice);

        BigDecimal paid = getPaidAmount(invoiceId);
        BigDecimal remaining = invoice.getTotalAmount().subtract(paid);

        if (remaining.signum() <= 0) {
            throw new AppException(ErrorCode.INVOICE_ALREADY_PAID);
        }
        if (amount.compareTo(remaining) > 0) {
            throw new AppException(ErrorCode.PAYMENT_EXCEEDS_TOTAL);
        }

        LocalDateTime paymentDate = request.getPaymentDate() != null
                ? request.getPaymentDate()
                : LocalDateTime.now(VIETNAM_ZONE);

        // Không thu tiền trước ngày lập hóa đơn
        if (paymentDate.toLocalDate().isBefore(invoice.getIssueDate())) {
            throw new AppException(ErrorCode.PAYMENT_DATE_INVALID);
        }

        String transactionCode = trimToNull(request.getTransactionCode());
        if (transactionCode != null
                && paymentRepository.existsByTransactionCodeAndDeletedFalse(transactionCode)) {
            throw new AppException(ErrorCode.PAYMENT_TRANSACTION_DUPLICATE);
        }

        Payment payment = Payment.builder()
                .invoice(invoice)
                .amount(amount)
                .paymentMethod(request.getPaymentMethod())
                .paymentDate(paymentDate)
                .transactionCode(transactionCode)
                .note(trimToNull(request.getNote()))
                .build();
        paymentRepository.saveAndFlush(payment);

        refreshInvoice(invoice);

        return invoiceService.getInvoiceById(invoiceId);
    }

    // =========================================================
    // 2. LỊCH SỬ THANH TOÁN
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByInvoice(Long invoiceId) {
        if (invoiceId == null || !invoiceRepository.existsByIdAndDeletedFalse(invoiceId)) {
            throw new AppException(ErrorCode.INVOICE_NOT_FOUND);
        }

        return invoiceMapper.toPaymentResponses(
                paymentRepository
                        .findByInvoice_IdAndDeletedFalseOrderByPaymentDateDescIdDesc(invoiceId));
    }

    // =========================================================
    // 3. XÓA THANH TOÁN NHẬP NHẦM (xóa mềm)
    // =========================================================
    @Override
    public InvoiceDetailResponse deletePayment(Long invoiceId, Long paymentId) {
        Invoice invoice = getInvoiceForUpdate(invoiceId);
        requirePayable(invoice);

        if (paymentId == null) {
            throw new AppException(ErrorCode.PAYMENT_NOT_FOUND);
        }

        // Tìm theo cả id hóa đơn: không xóa nhầm thanh toán của hóa đơn khác
        Payment payment = paymentRepository
                .findByIdAndInvoice_IdAndDeletedFalse(paymentId, invoiceId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        payment.setDeleted(true);
        paymentRepository.saveAndFlush(payment);

        refreshInvoice(invoice);

        return invoiceService.getInvoiceById(invoiceId);
    }

    // =========================================================
    // HÀM PHỤ
    // =========================================================

    private Invoice getInvoiceForUpdate(Long invoiceId) {
        if (invoiceId == null) {
            throw new AppException(ErrorCode.INVOICE_NOT_FOUND);
        }

        return invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new AppException(ErrorCode.INVOICE_NOT_FOUND));
    }

    // Hóa đơn nháp hoặc đã hủy thì không thu tiền / không sửa thanh toán
    private void requirePayable(Invoice invoice) {
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new AppException(ErrorCode.INVOICE_INVALID_STATUS);
        }
    }

    private BigDecimal getPaidAmount(Long invoiceId) {
        BigDecimal paid = paymentRepository.sumAmountByInvoiceId(invoiceId);
        return paid != null ? paid : BigDecimal.ZERO;
    }

    // Tính lại từ tổng các thanh toán còn hiệu lực, không cộng trừ dồn
    // nên số liệu luôn khớp với bảng payments
    private void refreshInvoice(Invoice invoice) {
        recalculate(invoice, getPaidAmount(invoice.getId()));
        invoiceRepository.saveAndFlush(invoice);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
