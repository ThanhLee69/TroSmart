package com.project.trosmart.pdf;

import com.project.trosmart.entity.Building;
import com.project.trosmart.entity.Contract;
import com.project.trosmart.entity.ContractTenant;
import com.project.trosmart.entity.Invoice;
import com.project.trosmart.entity.InvoiceItem;
import com.project.trosmart.entity.MeterReading;
import com.project.trosmart.entity.Payment;
import com.project.trosmart.entity.Room;
import com.project.trosmart.enums.InvoiceItemType;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.PaymentMethod;
import com.project.trosmart.util.VietnameseNumberToWords;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Chuyển hóa đơn (entity) thành dữ liệu đã định dạng để điền vào mẫu PDF.
 * Phải gọi trong transaction vì đọc các quan hệ LAZY (hợp đồng, phòng, tòa nhà, các dòng, chỉ số điện nước).
 */
@Component
@RequiredArgsConstructor
public class InvoicePdfDataFactory {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ContractPdfProperties landlordProperties;
    private final InvoicePdfProperties invoiceProperties;

    /**
     * @param primary  khách đứng tên hợp đồng (có thể null)
     * @param payments các lần thanh toán chưa xóa, thứ tự bất kỳ (hàm tự sắp xếp cũ trước, mới sau)
     */
    public InvoicePdfData create(Invoice invoice, ContractTenant primary, List<Payment> payments) {
        Contract contract = invoice.getContract();
        Room room = contract.getRoom();
        Building building = room == null ? null : room.getBuilding();

        boolean cancelled = invoice.getStatus() == InvoiceStatus.CANCELLED;

        BigDecimal total = zeroIfNull(invoice.getTotalAmount());
        BigDecimal paid = zeroIfNull(invoice.getPaidAmount());
        // Hóa đơn đã hủy không còn khoản phải thu
        BigDecimal remaining = cancelled ? BigDecimal.ZERO : zeroIfNull(invoice.getRemainingAmount());

        InvoicePdfProperties.Bank bank = invoiceProperties.getBank();
        boolean hasBank = bank != null && hasText(bank.getAccountNumber());

        List<InvoicePdfData.PaymentRow> paymentRows = buildPaymentRows(payments);

        return InvoicePdfData.builder()
                .buildingName(building == null ? "" : orEmpty(building.getName()))
                .buildingAddress(building == null ? "" : orEmpty(building.getAddress()))
                .landlordName(orEmpty(landlordProperties.getFullName()))
                .landlordPhone(orEmpty(landlordProperties.getPhone()))

                .invoiceCode(orEmpty(invoice.getInvoiceCode()))
                .issueDate(date(invoice.getIssueDate()))
                .dueDate(date(invoice.getDueDate()))
                .periodLabel("Tháng " + invoice.getBillingMonth() + "/" + invoice.getBillingYear())
                .statusClass(statusClass(invoice.getStatus()))
                .statusLabel(statusLabel(invoice.getStatus()))

                .tenantName(primary == null || primary.getTenant() == null
                        ? "" : orEmpty(primary.getTenant().getFullName()))
                .tenantPhone(primary == null || primary.getTenant() == null
                        ? "—" : orDash(primary.getTenant().getPhone()))
                .roomNumber(room == null ? "" : orEmpty(room.getRoomNumber()))
                .contractCode(orEmpty(contract.getContractCode()))

                .items(buildItems(invoice))
                .total(money(total))
                .paid(money(paid))
                .remaining(money(remaining))
                .totalWords(VietnameseNumberToWords.moneyToWords(
                        total.setScale(0, RoundingMode.HALF_UP).longValue()))

                .hasPayments(!paymentRows.isEmpty())
                .payments(paymentRows)

                .hasBank(hasBank)
                .bankName(hasBank ? orEmpty(bank.getName()) : "")
                .bankAccountNumber(hasBank ? bank.getAccountNumber().trim() : "")
                .bankAccountHolder(hasBank ? orEmpty(bank.getAccountHolder()) : "")
                // Mã hóa đơn toàn chữ không dấu nên ngân hàng nào cũng nhận được trong nội dung chuyển khoản
                .transferContent(orEmpty(invoice.getInvoiceCode()))

                .note(buildNote(invoice, cancelled))
                .build();
    }

    // =====================================================
    // CÁC DÒNG TIỀN
    // =====================================================

    private List<InvoicePdfData.Item> buildItems(Invoice invoice) {
        if (invoice.getDetails() == null) {
            return List.of();
        }

        // Theo thứ tự đã tạo: tiền phòng, điện, nước, dịch vụ, rồi dòng nhập tay
        List<InvoiceItem> sorted = invoice.getDetails().stream()
                .sorted(Comparator.comparing(InvoiceItem::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<InvoicePdfData.Item> rows = new ArrayList<>();

        for (int i = 0; i < sorted.size(); i++) {
            InvoiceItem item = sorted.get(i);

            rows.add(InvoicePdfData.Item.builder()
                    .index(i + 1)
                    .name(orEmpty(item.getItemName()))
                    .detail(meterDetail(invoice, item))
                    .quantity(number(item.getQuantity()))
                    .unitPrice(money(item.getUnitPrice()))
                    // Giảm giá lưu số âm nên hiện ra "-50.000"
                    .amount(money(item.getAmount()))
                    .build());
        }

        return rows;
    }

    /**
     * Dòng điện, nước kèm chỉ số cũ và mới, ví dụ "Chỉ số cũ 1.204, mới 1.289".
     * Không có bản ghi điện nước (hóa đơn đã hủy gỡ liên kết) thì bỏ dòng phụ.
     */
    private String meterDetail(Invoice invoice, InvoiceItem item) {
        MeterReading reading = invoice.getMeterReading();

        if (reading == null || item.getItemType() == null) {
            return null;
        }

        String startProperty;
        String endProperty;

        if (item.getItemType() == InvoiceItemType.ELECTRICITY) {
            startProperty = "electricityStart";
            endProperty = "electricityEnd";
        } else if (item.getItemType() == InvoiceItemType.WATER) {
            startProperty = "waterStart";
            endProperty = "waterEnd";
        } else {
            return null;
        }

        BigDecimal start = readNumber(reading, startProperty);
        BigDecimal end = readNumber(reading, endProperty);

        if (start == null || end == null) {
            return null;
        }

        return "Chỉ số cũ " + number(start) + ", mới " + number(end);
    }

    // =====================================================
    // THANH TOÁN, GHI CHÚ
    // =====================================================

    private List<InvoicePdfData.PaymentRow> buildPaymentRows(List<Payment> payments) {
        if (payments == null || payments.isEmpty()) {
            return List.of();
        }

        return payments.stream()
                .sorted(Comparator
                        .comparing(Payment::getPaymentDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Payment::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(payment -> InvoicePdfData.PaymentRow.builder()
                        .date(payment.getPaymentDate() == null ? "" : payment.getPaymentDate().format(DATE_FORMAT))
                        .method(methodLabel(payment.getPaymentMethod()))
                        .code(hasText(payment.getTransactionCode()) ? payment.getTransactionCode().trim() : "-")
                        .amount(money(payment.getAmount()))
                        .build())
                .toList();
    }

    private String buildNote(Invoice invoice, boolean cancelled) {
        String note = hasText(invoice.getNote()) ? invoice.getNote().trim() : null;

        if (cancelled && hasText(invoice.getCancelReason())) {
            String reason = "Hóa đơn đã hủy. Lý do: " + invoice.getCancelReason().trim();
            return note == null ? reason : note + "\n" + reason;
        }

        return note;
    }

    // =====================================================
    // NHÃN TIẾNG VIỆT
    // =====================================================

    private String statusLabel(InvoiceStatus status) {
        if (status == null) {
            return "";
        }

        return switch (status) {
            case PAID -> "ĐÃ THANH TOÁN";
            case UNPAID -> "CHƯA THANH TOÁN";
            case PARTIALLY_PAID -> "THANH TOÁN MỘT PHẦN";
            case OVERDUE -> "QUÁ HẠN";
            case CANCELLED -> "ĐÃ HỦY";
        };
    }

    // Trùng tên class CSS .status-xxx trong mẫu
    private String statusClass(InvoiceStatus status) {
        if (status == null) {
            return "unpaid";
        }

        return switch (status) {
            case PAID -> "paid";
            case UNPAID -> "unpaid";
            case PARTIALLY_PAID -> "partial";
            case OVERDUE -> "overdue";
            case CANCELLED -> "cancelled";
        };
    }

    private String methodLabel(PaymentMethod method) {
        if (method == null) {
            return "";
        }

        return switch (method) {
            case CASH -> "Tiền mặt";
            case BANK_TRANSFER -> "Chuyển khoản";
        };
    }

    // =====================================================
    // ĐỊNH DẠNG
    // =====================================================

    // 3500000 thành "3.500.000" (dấu chấm ngăn cách hàng nghìn); số âm thành "-50.000"
    private String money(BigDecimal amount) {
        BigDecimal value = amount == null ? BigDecimal.ZERO : amount;

        return format("#,##0", value.setScale(0, RoundingMode.HALF_UP));
    }

    // Số lượng, chỉ số: bỏ số 0 thừa phía sau, lẻ thì dùng dấu phẩy (85 thành "85", 12.5 thành "12,5")
    private String number(BigDecimal value) {
        if (value == null) {
            return "0";
        }

        return format("#,##0.##", value.stripTrailingZeros());
    }

    private String format(String pattern, BigDecimal value) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.US);
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');

        return new DecimalFormat(pattern, symbols).format(value);
    }

    private String date(java.time.LocalDate value) {
        return value == null ? "" : value.format(DATE_FORMAT);
    }

    // Đọc thuộc tính số của bean theo tên, không có hoặc null thì trả null
    private BigDecimal readNumber(Object bean, String propertyName) {
        BeanWrapper wrapper = new BeanWrapperImpl(bean);

        if (!wrapper.isReadableProperty(propertyName)) {
            return null;
        }

        Object value = wrapper.getPropertyValue(propertyName);

        return value instanceof Number ? new BigDecimal(value.toString()) : null;
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String orEmpty(String value) {
        return hasText(value) ? value.trim() : "";
    }

    private String orDash(String value) {
        return hasText(value) ? value.trim() : "—";
    }
}
