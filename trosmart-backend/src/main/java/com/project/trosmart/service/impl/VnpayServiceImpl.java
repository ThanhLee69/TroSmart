package com.project.trosmart.service.impl;

import com.project.trosmart.configuration.VnpayConfiguration;
import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.entity.Invoice;
import com.project.trosmart.entity.Payment;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.PaymentMethod;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.repository.InvoiceRepository;
import com.project.trosmart.repository.PaymentRepository;
import com.project.trosmart.service.VnpayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import static com.project.trosmart.util.CalculationUtils.recalculate;

@Slf4j
@Service
@RequiredArgsConstructor
public class VnpayServiceImpl implements VnpayService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNP_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    // Chỉ hóa đơn đang cần thu mới được trả qua VNPay
    private static final List<InvoiceStatus> PAYABLE = List.of(
            InvoiceStatus.UNPAID,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE
    );

    private final VnpayConfiguration props;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    // =========================================================
    // 1. TẠO LINK THANH TOÁN
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public String createPaymentUrl(Long invoiceId, String ipAddress) {
        if (invoiceId == null || !invoiceRepository.existsByIdAndDeletedFalse(invoiceId)) {
            throw new AppException(ErrorCode.INVOICE_NOT_FOUND);
        }

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new AppException(ErrorCode.INVOICE_NOT_FOUND));

        if (!PAYABLE.contains(invoice.getStatus())) {
            throw new AppException(ErrorCode.INVOICE_INVALID_STATUS);
        }

        BigDecimal remaining = invoice.getTotalAmount().subtract(getPaidAmount(invoiceId));
        if (remaining.signum() <= 0) {
            throw new AppException(ErrorCode.INVOICE_ALREADY_PAID);
        }

        // VNPay tính theo đồng, nhân 100 và không có phần lẻ
        BigDecimal vnpAmount = remaining.setScale(0, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);

        // Mỗi lần bấm là một mã giao dịch mới: {idHóaĐơn}T{mili giây}
        String txnRef = invoiceId + "T" + System.currentTimeMillis();

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", props.getTmnCode());
        params.put("vnp_Amount", vnpAmount.toBigInteger().toString());
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", txnRef);
        // Không dấu, không ký tự đặc biệt theo yêu cầu của VNPay
        params.put("vnp_OrderInfo", "Thanh toan hoa don " + invoice.getInvoiceCode());
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", props.getReturnUrl());
        params.put("vnp_IpAddr", ipAddress);
        params.put("vnp_CreateDate", now.format(VNP_TIME));
        params.put("vnp_ExpireDate", now.plusMinutes(15).format(VNP_TIME));

        String query = buildQuery(params);
        String secureHash = hmacSha512(props.getHashSecret(), buildHashData(params));

        return props.getPayUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    // =========================================================
    // 2. NHẬN KẾT QUẢ TỪ VNPAY
    // =========================================================
    @Override
    @Transactional
    public VnpayResult handleCallback(Map<String, String> params) {
        // 2.1 Kiểm tra chữ ký: không đúng thì bỏ qua hoàn toàn
        if (!isValidSignature(params)) {
            return new VnpayResult("97", "Invalid signature", null, false);
        }

        // 2.2 Tìm hóa đơn từ mã giao dịch
        Long invoiceId = parseInvoiceId(params.get("vnp_TxnRef"));
        if (invoiceId == null) {
            return new VnpayResult("01", "Order not found", null, false);
        }

        // Khóa hóa đơn: IPN và trang quay về cùng đến một lúc vẫn chỉ ghi nhận một lần
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId).orElse(null);
        if (invoice == null) {
            return new VnpayResult("01", "Order not found", null, false);
        }

        String transactionNo = params.get("vnp_TransactionNo");
        String transactionCode = "VNPAY-" + transactionNo;

        // 2.3 Giao dịch này đã được ghi nhận rồi
        if (paymentRepository.existsByTransactionCodeAndDeletedFalse(transactionCode)) {
            return new VnpayResult("02", "Order already confirmed", invoiceId, true);
        }

        // 2.4 Người dùng hủy hoặc ngân hàng từ chối: không ghi nhận gì
        boolean paid = "00".equals(params.get("vnp_ResponseCode"))
                && "00".equals(params.get("vnp_TransactionStatus"));
        if (!paid) {
            return new VnpayResult("00", "Confirm Success", invoiceId, false);
        }

        // 2.5 Kiểm tra số tiền và trạng thái hóa đơn
        BigDecimal amount;
        try {
            amount = new BigDecimal(params.get("vnp_Amount"))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } catch (RuntimeException e) {
            return new VnpayResult("04", "Invalid amount", invoiceId, false);
        }

        BigDecimal remaining = invoice.getTotalAmount().subtract(getPaidAmount(invoiceId));

        if (invoice.getStatus() == InvoiceStatus.CANCELLED || remaining.signum() <= 0) {
            log.warn("VNPay: hóa đơn {} không còn cần thu nhưng nhận được tiền, giao dịch {}",
                    invoiceId, transactionNo);
            return new VnpayResult("02", "Order already confirmed", invoiceId, false);
        }

        if (amount.signum() <= 0 || amount.compareTo(remaining) > 0) {
            log.warn("VNPay: số tiền {} vượt phần còn nợ {} của hóa đơn {}",
                    amount, remaining, invoiceId);
            return new VnpayResult("04", "Invalid amount", invoiceId, false);
        }

        // 2.6 Ghi nhận thanh toán và tính lại hóa đơn
        Payment payment = Payment.builder()
                .invoice(invoice)
                .amount(amount)
                .paymentMethod(PaymentMethod.VNPAY)
                .paymentDate(LocalDateTime.now(VIETNAM_ZONE))
                .transactionCode(transactionCode)
                .note("Thanh toán qua VNPay"
                        + (params.get("vnp_BankCode") != null
                        ? " (" + params.get("vnp_BankCode") + ")" : ""))
                .build();
        paymentRepository.saveAndFlush(payment);

        recalculate(invoice, getPaidAmount(invoiceId));
        invoiceRepository.saveAndFlush(invoice);

        return new VnpayResult("00", "Confirm Success", invoiceId, true);
    }

    // =========================================================
    // HÀM PHỤ
    // =========================================================

    private BigDecimal getPaidAmount(Long invoiceId) {
        BigDecimal paid = paymentRepository.sumAmountByInvoiceId(invoiceId);
        return paid != null ? paid : BigDecimal.ZERO;
    }

    private Long parseInvoiceId(String txnRef) {
        if (txnRef == null) {
            return null;
        }
        int index = txnRef.indexOf('T');
        if (index <= 0) {
            return null;
        }
        try {
            return Long.parseLong(txnRef.substring(0, index));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // Chữ ký tính trên mọi tham số vnp_*, trừ chính chữ ký
    private boolean isValidSignature(Map<String, String> params) {
        String received = params.get("vnp_SecureHash");
        if (received == null || received.isBlank()) {
            return false;
        }

        Map<String, String> signed = new TreeMap<>();
        params.forEach((key, value) -> {
            if (key.startsWith("vnp_")
                    && !key.equals("vnp_SecureHash")
                    && !key.equals("vnp_SecureHashType")) {
                signed.put(key, value);
            }
        });

        String expected = hmacSha512(props.getHashSecret(), buildHashData(signed));
        return expected.equalsIgnoreCase(received);
    }

    // key=value nối bằng &, giá trị mã hóa URL, bỏ tham số rỗng. Đây là chuỗi đem đi ký
    private String buildHashData(Map<String, String> sortedParams) {
        StringBuilder sb = new StringBuilder();
        sortedParams.forEach((key, value) -> {
            if (value != null && !value.isEmpty()) {
                if (sb.length() > 0) {
                    sb.append('&');
                }
                sb.append(key).append('=')
                        .append(URLEncoder.encode(value, StandardCharsets.US_ASCII));
            }
        });
        return sb.toString();
    }

    // Giống buildHashData nhưng mã hóa cả tên tham số, dùng để gắn vào URL
    private String buildQuery(Map<String, String> sortedParams) {
        StringBuilder sb = new StringBuilder();
        sortedParams.forEach((key, value) -> {
            if (value != null && !value.isEmpty()) {
                if (sb.length() > 0) {
                    sb.append('&');
                }
                sb.append(URLEncoder.encode(key, StandardCharsets.US_ASCII)).append('=')
                        .append(URLEncoder.encode(value, StandardCharsets.US_ASCII));
            }
        });
        return sb.toString();
    }

    private String hmacSha512(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Không ký được dữ liệu VNPay", e);
        }
    }
}