package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.InvoiceCancelRequest;
import com.project.trosmart.dto.request.InvoiceManualItemRequest;
import com.project.trosmart.dto.request.InvoicePreviewRequest;
import com.project.trosmart.dto.request.InvoiceRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.entity.*;
import com.project.trosmart.enums.BillingType;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.InvoiceItemType;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.MeterReadingStatus;
import com.project.trosmart.enums.ServiceCode;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.InvoiceMapper;
import com.project.trosmart.pdf.InvoicePdfData;
import com.project.trosmart.pdf.InvoicePdfDataFactory;
import com.project.trosmart.pdf.InvoicePdfRenderer;
import com.project.trosmart.repository.ContractRepository;
import com.project.trosmart.repository.InvoiceRepository;
import com.project.trosmart.repository.MeterReadingRepository;
import com.project.trosmart.repository.PaymentRepository;
import com.project.trosmart.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.project.trosmart.util.CalculationUtils.resolveStatus;
import static com.project.trosmart.util.CalculationUtils.roundMoney;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    // Cột tiền là DECIMAL(15,2) nên mỗi con số phải nhỏ hơn 10^13
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("10000000000000");

    // Số dòng phụ phí/giảm giá nhập tay tối đa trong 1 hóa đơn
    private static final int MAX_MANUAL_ITEMS = 50;

    private static final int DEFAULT_PAYMENT_DUE_DAY = 5;

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final ContractRepository contractRepository;
    private final MeterReadingRepository meterReadingRepository;
    private final InvoiceMapper invoiceMapper;
    private final InvoicePdfDataFactory invoicePdfDataFactory;
    private final InvoicePdfRenderer invoicePdfRenderer;
    // =========================================================
    // 1. DANH SÁCH HÓA ĐƠN
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public PageResponse<InvoiceResponse> getInvoices(
            Long buildingId,
            Integer billingMonth,
            Integer billingYear,
            InvoiceStatus status,
            String keyword,
            int page,
            int size
    ) {
        validateBuildingId(buildingId);
        validateOptionalPeriod(billingMonth, billingYear);

        Page<Invoice> result = invoiceRepository.searchInvoices(
                buildingId,
                billingMonth,
                billingYear,
                status,
                buildKeywordPattern(keyword),
                buildPageable(page, size)
        );

        return toInvoicePage(result);
    }

    // =========================================================
    // 2. THỐNG KÊ CỦA KỲ
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public InvoiceDashboardResponse getInvoiceDashboard(
            Long buildingId,
            Integer billingMonth,
            Integer billingYear
    ) {
        validateBuildingId(buildingId);
        requirePeriod(billingMonth, billingYear);

        List<Object[]> rows = invoiceRepository.getInvoiceStatistics(
                buildingId, billingMonth, billingYear);

        // Câu truy vấn gộp luôn trả đúng 1 dòng; SUM là null khi chưa có hóa đơn nào
        Object[] row = rows.isEmpty() ? new Object[5] : rows.get(0);

        return InvoiceDashboardResponse.builder()
                .totalAmount(toBigDecimal(row[0]))
                .paidAmount(toBigDecimal(row[1]))
                .remainingAmount(toBigDecimal(row[2]))
                .invoiceCount(toLong(row[3]))
                .overdueCount(toLong(row[4]))
                .build();
    }

    // =========================================================
    // 3. CHI TIẾT HÓA ĐƠN
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public InvoiceDetailResponse getInvoiceById(Long id) {
        return buildDetail(getActiveInvoice(id));
    }

    // =========================================================
    // 4. HỢP ĐỒNG CÓ THỂ LẬP HÓA ĐƠN TRONG KỲ
    // Hợp đồng ACTIVE, thời hạn có giao với kỳ, chưa có hóa đơn nào chưa hủy
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public List<InvoiceContractOptionResponse> getAvailableContracts(
            Integer billingMonth,
            Integer billingYear
    ) {
        YearMonth period = validateBillingPeriod(billingMonth, billingYear);

        List<Contract> contracts = contractRepository.findContractsAvailableForInvoice(
                ContractStatus.ACTIVE,
                billingMonth,
                billingYear,
                period.atDay(1),
                period.atEndOfMonth()
        );

        Map<Long, ContractTenant> primaryTenants = loadPrimaryTenants(
                contracts.stream().map(Contract::getId).toList());

        LocalDate today = today();

        return contracts.stream()
                .map(contract -> {
                    Room room = contract.getRoom();
                    ContractTenant primary = primaryTenants.get(contract.getId());

                    return InvoiceContractOptionResponse.builder()
                            .contractId(contract.getId())
                            .contractCode(contract.getContractCode())
                            .roomId(room.getId())
                            .roomNumber(room.getRoomNumber())
                            .buildingName(room.getBuilding().getName())
                            .tenantName(primary != null
                                    ? primary.getTenant().getFullName() : null)
                            .rentPrice(contract.getRentPrice())
                            .paymentDueDay(contract.getPaymentDueDay())
                            .paymentCycle(contract.getPaymentCycle())
                            .suggestedDueDate(calculateDueDate(contract, period, today))
                            .build();
                })
                .toList();
    }

    // =========================================================
    // 5. LẬP HÓA ĐƠN
    // Dòng tự động: tiền phòng, điện, nước, dịch vụ cố định hàng tháng
    // Dòng nhập tay: phụ phí, giảm giá
    // =========================================================
    @Override
    public InvoiceDetailResponse createInvoice(InvoiceRequest request) {
        if (request == null || request.getContractId() == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        validateDates(request.getIssueDate(), request.getDueDate());

        // Khóa hợp đồng để 2 người cùng lập hóa đơn một kỳ không bị trùng
        Contract contract = contractRepository
                .findByIdForUpdate(request.getContractId())
                .orElseThrow(() -> new AppException(ErrorCode.CONTRACT_NOT_FOUND));

        // Kiểm tra hợp đồng + kỳ, dựng hóa đơn với các dòng tự động
        PreparedInvoice prepared = prepareInvoice(
                contract,
                request.getBillingMonth(),
                request.getBillingYear(),
                request.getIssueDate(),
                request.getDueDate(),
                trimToNull(request.getNote())
        );
        Invoice invoice = prepared.invoice();
        MeterReading reading = prepared.reading();

        // --- Dòng nhập tay ---
        addManualItems(invoice, request.getItems());

        // --- Tổng tiền ---
        BigDecimal total = invoice.getDetails().stream()
                .map(InvoiceItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (total.signum() <= 0) {
            throw new AppException(ErrorCode.INVOICE_INVALID_TOTAL);
        }
        if (total.compareTo(MAX_AMOUNT) >= 0) {
            throw new AppException(ErrorCode.INVOICE_INVALID_ITEM);
        }

        invoice.setTotalAmount(total);
        invoice.setPaidAmount(BigDecimal.ZERO);
        invoice.setRemainingAmount(total);
        // Hạn đã qua ngay từ lúc lập thì là OVERDUE luôn, không chờ job
        invoice.setStatus(resolveStatus(invoice));

        try {
            // saveAndFlush để bắt lỗi trùng bản ghi điện nước do unique constraint
            invoice = invoiceRepository.saveAndFlush(invoice);
        } catch (DataIntegrityViolationException e) {
            throw new AppException(reading != null
                    ? ErrorCode.INVOICE_METER_READING_ALREADY_USED
                    : ErrorCode.INVOICE_DUPLICATE_PERIOD);
        }

        // Mã hóa đơn lấy theo id nên không bao giờ trùng, kể cả khi 2 người lập cùng lúc
        invoice.setInvoiceCode(buildInvoiceCode(invoice));
        invoiceRepository.save(invoice);

        if (reading != null) {
            reading.setStatus(MeterReadingStatus.INVOICED);
            meterReadingRepository.save(reading);
        }

        return buildDetail(invoice);
    }

    // =========================================================
    // 5b. XEM TRƯỚC HÓA ĐƠN
    // Dựng các dòng tự động (tiền phòng, điện, nước, dịch vụ) và tổng tiền
    // như khi lập thật nhưng KHÔNG lưu gì và không khóa điện nước.
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public InvoicePreviewResponse previewInvoice(InvoicePreviewRequest request) {
        if (request == null || request.getContractId() == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Contract contract = contractRepository
                .findByIdAndDeletedFalse(request.getContractId())
                .orElseThrow(() -> new AppException(ErrorCode.CONTRACT_NOT_FOUND));

        LocalDate today = today();
        Invoice invoice = prepareInvoice(
                contract,
                request.getBillingMonth(),
                request.getBillingYear(),
                today,
                today,
                null
        ).invoice();

        BigDecimal total = invoice.getDetails().stream()
                .map(InvoiceItem::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return InvoicePreviewResponse.builder()
                .items(invoiceMapper.toInvoiceItemResponses(invoice.getDetails()))
                .totalAmount(total)
                .build();
    }

    // =========================================================
    // 6. HỦY HÓA ĐƠN
    // Chỉ khi chưa có thanh toán nào. Mở khóa điện nước để lập lại được.
    // =========================================================
    @Override
    public InvoiceDetailResponse cancelInvoice(Long id, InvoiceCancelRequest request) {
        String reason = request != null ? trimToNull(request.getReason()) : null;
        if (reason == null) {
            throw new AppException(ErrorCode.INVOICE_CANCEL_REASON_REQUIRED);
        }
        if (reason.length() > 300) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Invoice invoice = getInvoiceForUpdate(id);

        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw new AppException(ErrorCode.INVOICE_INVALID_STATUS);
        }

        boolean hasPayments = invoice.getPaidAmount().signum() > 0
                || paymentRepository.existsByInvoice_IdAndDeletedFalse(invoice.getId());
        if (hasPayments) {
            throw new AppException(ErrorCode.INVOICE_HAS_PAYMENTS);
        }

        // Mở khóa bản ghi điện nước và gỡ liên kết
        MeterReading reading = invoice.getMeterReading();
        if (reading != null) {
            if (reading.getStatus() == MeterReadingStatus.INVOICED) {
                reading.setStatus(MeterReadingStatus.RECORDED);
            }
            meterReadingRepository.save(reading);
            invoice.setMeterReading(null);
        }

        invoice.setStatus(InvoiceStatus.CANCELLED);
        invoice.setCancelReason(reason);
        invoiceRepository.saveAndFlush(invoice);

        return buildDetail(invoice);
    }

    // =========================================================
    // 8. JOB QUÁ HẠN
    // =========================================================
    @Override
    public void markOverdueInvoices() {
        List<Invoice> invoices = invoiceRepository.findInvoicesToMarkOverdue(
                List.of(InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID),
                today()
        );

        if (invoices.isEmpty()) {
            return;
        }

        for (Invoice invoice : invoices) {
            invoice.setStatus(InvoiceStatus.OVERDUE);
        }
        invoiceRepository.saveAll(invoices);

        log.info("Đã chuyển {} hóa đơn sang quá hạn", invoices.size());
    }

    @Override
    @Transactional(readOnly = true)
    public InvoicePdfFile exportInvoicePdf(Long id) {
        Invoice invoice = getActiveInvoice(id);

        Long contractId = invoice.getContract().getId();
        ContractTenant primary = loadPrimaryTenants(List.of(contractId)).get(contractId);

        List<Payment> payments = paymentRepository
                .findByInvoice_IdAndDeletedFalseOrderByPaymentDateDescIdDesc(invoice.getId());

        InvoicePdfData data = invoicePdfDataFactory.create(invoice, primary, payments);
        byte[] content = invoicePdfRenderer.render(data);

        String code = invoice.getInvoiceCode() == null ? String.valueOf(invoice.getId()) : invoice.getInvoiceCode();

        return new InvoicePdfFile("hoa-don-" + code + ".pdf", content);
    }


    // =========================================================
    // HÀM PHỤ: KIỂM TRA VÀ DỰNG HÓA ĐƠN (dùng chung cho lập thật và xem trước)
    // =========================================================

    // Hóa đơn chưa lưu kèm bản ghi điện nước dùng cho nó (null nếu hợp đồng không có điện nước)
    private record PreparedInvoice(Invoice invoice, MeterReading reading) {
    }

    private PreparedInvoice prepareInvoice(
            Contract contract,
            Integer billingMonth,
            Integer billingYear,
            LocalDate issueDate,
            LocalDate dueDate,
            String note
    ) {
        YearMonth period = validateBillingPeriod(billingMonth, billingYear);

        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new AppException(ErrorCode.INVOICE_CONTRACT_NOT_ACTIVE);
        }

        Room room = contract.getRoom();
        if (room == null || Boolean.TRUE.equals(room.getDeleted())) {
            throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        }

        // Kỳ phải có giao với thời hạn hợp đồng
        if (period.atEndOfMonth().isBefore(contract.getStartDate())
                || period.atDay(1).isAfter(contract.getEndDate())) {
            throw new AppException(ErrorCode.INVOICE_PERIOD_OUT_OF_CONTRACT);
        }

        boolean duplicated = invoiceRepository
                .existsByContract_IdAndBillingMonthAndBillingYearAndStatusNotAndDeletedFalse(
                        contract.getId(),
                        billingMonth,
                        billingYear,
                        InvoiceStatus.CANCELLED
                );
        if (duplicated) {
            throw new AppException(ErrorCode.INVOICE_DUPLICATE_PERIOD);
        }

        List<ContractServiceItem> services = getActiveServices(contract);
        ContractServiceItem electricityService =
                findFirstByServiceCode(services, ServiceCode.ELECTRICITY);
        ContractServiceItem waterService =
                findFirstByServiceCode(services, ServiceCode.WATER);

        // Hợp đồng có điện hoặc nước thì bắt buộc đã ghi chỉ số của kỳ
        MeterReading reading = null;
        if (electricityService != null || waterService != null) {
            reading = getRecordedReading(room.getId(), billingMonth, billingYear);
        }

        Invoice invoice = Invoice.builder()
                .invoiceCode("TMP-" + UUID.randomUUID())
                .contract(contract)
                .billingMonth(billingMonth)
                .billingYear(billingYear)
                .issueDate(issueDate)
                .dueDate(dueDate)
                .status(InvoiceStatus.UNPAID)
                .note(note)
                .meterReading(reading)
                .build();

        // --- Dòng tự động ---
        addItem(invoice, InvoiceItemType.ROOM_FEE,
                "Tiền phòng tháng " + billingMonth + "/" + billingYear,
                BigDecimal.ONE,
                contract.getRentPrice());

        if (electricityService != null) {
            addUsageItem(invoice, InvoiceItemType.ELECTRICITY,
                    electricityService, reading.getElectricityConsumption());
        }

        if (waterService != null) {
            addUsageItem(invoice, InvoiceItemType.WATER,
                    waterService, reading.getWaterConsumption());
        }

        // Các dịch vụ còn lại (điện, nước đã xử lý ở trên): gửi xe, theo người, cố định hàng tháng
        for (ContractServiceItem service : services) {
            ServiceCode code = getServiceCode(service);
            if (code == ServiceCode.ELECTRICITY || code == ServiceCode.WATER) {
                continue;
            }
            addServiceItem(invoice, contract, service, period);
        }

        return new PreparedInvoice(invoice, reading);
    }

    // =========================================================
    // HÀM PHỤ: DỰNG DÒNG HÓA ĐƠN
    // =========================================================

    // Dòng điện/nước: tên kèm lượng dùng, ví dụ "Điện (73 kWh)"
    private void addUsageItem(
            Invoice invoice,
            InvoiceItemType type,
            ContractServiceItem service,
            BigDecimal consumption
    ) {
        String name = service.getServiceName()
                + " (" + consumption.stripTrailingZeros().toPlainString()
                + " " + service.getUnit() + ")";

        addItem(invoice, type, name, consumption, service.getUnitPrice());
    }

    private void addManualItems(
            Invoice invoice,
            List<InvoiceManualItemRequest> items
    ) {
        if (items == null || items.isEmpty()) {
            return;
        }
        if (items.size() > MAX_MANUAL_ITEMS) {
            throw new AppException(ErrorCode.INVOICE_INVALID_ITEM);
        }

        for (InvoiceManualItemRequest item : items) {
            if (item == null) {
                throw new AppException(ErrorCode.INVOICE_INVALID_ITEM);
            }

            // Chỉ cho nhập tay phụ phí và giảm giá
            if (item.getItemType() != InvoiceItemType.SURCHARGE
                    && item.getItemType() != InvoiceItemType.DISCOUNT) {
                throw new AppException(ErrorCode.INVOICE_INVALID_ITEM_TYPE);
            }

            String name = trimToNull(item.getItemName());
            if (name == null || name.length() > 255
                    || item.getQuantity() == null
                    || item.getUnitPrice() == null) {
                throw new AppException(ErrorCode.INVOICE_INVALID_ITEM);
            }

            addItem(invoice, item.getItemType(), name,
                    item.getQuantity(), item.getUnitPrice());
        }
    }

    // Thành tiền = số lượng x đơn giá; giảm giá lưu số âm để cộng thẳng vào tổng
    private void addItem(
            Invoice invoice,
            InvoiceItemType type,
            String name,
            BigDecimal quantity,
            BigDecimal unitPrice
    ) {
        BigDecimal qty = roundMoney(quantity);
        BigDecimal price = roundMoney(unitPrice);

        if (qty.signum() < 0 || price.signum() < 0) {
            throw new AppException(ErrorCode.INVOICE_INVALID_ITEM);
        }

        // Dòng nhập tay phải lớn hơn 0 (điện nước có thể bằng 0 nếu không dùng)
        boolean manual = type == InvoiceItemType.SURCHARGE
                || type == InvoiceItemType.DISCOUNT;
        if (manual && (qty.signum() == 0 || price.signum() == 0)) {
            throw new AppException(ErrorCode.INVOICE_INVALID_ITEM);
        }

        BigDecimal amount = roundMoney(qty.multiply(price));

        if (qty.compareTo(MAX_AMOUNT) >= 0
                || price.compareTo(MAX_AMOUNT) >= 0
                || amount.compareTo(MAX_AMOUNT) >= 0) {
            throw new AppException(ErrorCode.INVOICE_INVALID_ITEM);
        }

        if (type == InvoiceItemType.DISCOUNT) {
            amount = amount.negate();
        }

        invoice.getDetails().add(InvoiceItem.builder()
                .invoice(invoice)
                .itemType(type)
                .itemName(name)
                .quantity(qty)
                .unitPrice(price)
                .amount(amount)
                .build());
    }

    private List<ContractServiceItem> getActiveServices(Contract contract) {
        if (contract.getContractServices() == null) {
            return List.of();
        }

        return contract.getContractServices().stream()
                .filter(service -> !Boolean.TRUE.equals(service.getDeleted()))
                .toList();
    }

    // Mỗi loại (điện, nước) chỉ lấy 1 dịch vụ, tránh ra 2 dòng điện cho cùng chỉ số
    private ContractServiceItem findFirstByServiceCode(
            List<ContractServiceItem> services,
            ServiceCode serviceCode
    ) {
        List<ContractServiceItem> matched = services.stream()
                .filter(service -> getServiceCode(service) == serviceCode)
                .toList();

        if (matched.size() > 1) {
            log.warn("Hợp đồng có {} dịch vụ {}, chỉ tính dịch vụ đầu tiên",
                    matched.size(), serviceCode);
        }

        return matched.isEmpty() ? null : matched.get(0);
    }

    private ServiceCode getServiceCode(ContractServiceItem service) {
        return service.getServiceItem().getServiceCode();
    }

    // Dịch vụ không có đồng hồ. Số lượng theo loại:
    //   PARKING                -> số xe đã đăng ký của những người ở trong kỳ
    //   PER_PERSON             -> số người đang ở trong kỳ
    //   FIXED_MONTHLY          -> 1
    //   USAGE khác (CUSTOM)    -> chưa có nguồn số lượng nên tính 1 và ghi log cảnh báo
    private void addServiceItem(
            Invoice invoice,
            Contract contract,
            ContractServiceItem service,
            YearMonth period
    ) {
        ServiceCode code = getServiceCode(service);
        BillingType billingType = service.getServiceItem().getBillingType();

        BigDecimal quantity;
        boolean countedByQuantity = true;

        if (code == ServiceCode.PARKING) {
            quantity = BigDecimal.valueOf(invoiceRepository.countVehiclesOfContract(
                    contract.getId(), period.atDay(1), period.atEndOfMonth()));
        } else if (billingType == BillingType.PER_PERSON) {
            quantity = BigDecimal.valueOf(invoiceRepository.countResidentsOfContract(
                    contract.getId(), period.atDay(1), period.atEndOfMonth()));
        } else {
            if (billingType == BillingType.USAGE) {
                log.warn("Dịch vụ '{}' tính theo mức dùng nhưng không có đồng hồ, tính số lượng 1",
                        service.getServiceName());
            }
            quantity = BigDecimal.ONE;
            countedByQuantity = false;
        }

        // Không có xe hoặc không có người ở thì không tạo dòng 0 đồng
        if (countedByQuantity && quantity.signum() == 0) {
            return;
        }

        String name = countedByQuantity
                ? service.getServiceName() + " (" + quantity.toPlainString()
                        + " " + service.getUnit() + ")"
                : service.getServiceName();

        addItem(invoice, InvoiceItemType.SERVICE, name, quantity, service.getUnitPrice());
    }

    // Bản ghi điện nước của phòng trong kỳ: phải đã ghi đủ và chưa dùng cho hóa đơn khác
    private MeterReading getRecordedReading(
            Long roomId,
            Integer billingMonth,
            Integer billingYear
    ) {
        MeterReading reading = meterReadingRepository
                .findByRoom_IdAndBillingMonthAndBillingYearAndDeletedFalse(
                        roomId, billingMonth, billingYear)
                .orElseThrow(() ->
                        new AppException(ErrorCode.INVOICE_METER_READING_MISSING));

        if (reading.getStatus() == MeterReadingStatus.INVOICED) {
            throw new AppException(ErrorCode.INVOICE_METER_READING_ALREADY_USED);
        }

        if (reading.getStatus() != MeterReadingStatus.RECORDED
                || reading.getElectricityEnd() == null
                || reading.getWaterEnd() == null) {
            throw new AppException(ErrorCode.INVOICE_METER_READING_MISSING);
        }

        return reading;
    }

    // Hạn gợi ý: ngày thanh toán của hợp đồng trong THÁNG SAU kỳ tính tiền
    // (khách trả sau), nhưng không sớm hơn 3 ngày kể từ ngày lập.
    // Nếu thu tiền phòng trả trước thì đổi plusMonths(1) thành plusMonths(0).
    private LocalDate calculateDueDate(
            Contract contract,
            YearMonth period,
            LocalDate issueDate
    ) {
        int day = contract.getPaymentDueDay() != null
                ? contract.getPaymentDueDay() : DEFAULT_PAYMENT_DUE_DAY;

        YearMonth dueMonth = period.plusMonths(1);
        int safeDay = Math.max(1, Math.min(day, dueMonth.lengthOfMonth()));

        LocalDate candidate = dueMonth.atDay(safeDay);
        LocalDate earliest = issueDate.plusDays(3);

        return candidate.isBefore(earliest) ? earliest : candidate;
    }

    // Mã dạng INV-202610-0123 (số cuối là id hóa đơn)
    private String buildInvoiceCode(Invoice invoice) {
        return String.format(
                "INV-%d%02d-%04d",
                invoice.getBillingYear(),
                invoice.getBillingMonth(),
                invoice.getId()
        );
    }

    // =========================================================
    // HÀM PHỤ: ĐỌC DỮ LIỆU VÀ DỰNG RESPONSE
    // =========================================================

    private Invoice getActiveInvoice(Long id) {
        if (id == null) {
            throw new AppException(ErrorCode.INVOICE_NOT_FOUND);
        }

        return invoiceRepository.findActiveById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVOICE_NOT_FOUND));
    }

    private Invoice getInvoiceForUpdate(Long id) {
        if (id == null) {
            throw new AppException(ErrorCode.INVOICE_NOT_FOUND);
        }

        return invoiceRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.INVOICE_NOT_FOUND));
    }

    private InvoiceDetailResponse buildDetail(Invoice invoice) {
        InvoiceDetailResponse response = invoiceMapper.toInvoiceDetailResponse(invoice);

        Long contractId = invoice.getContract().getId();
        ContractTenant primary = loadPrimaryTenants(List.of(contractId)).get(contractId);
        if (primary != null) {
            response.setTenantName(primary.getTenant().getFullName());
            response.setTenantPhone(primary.getTenant().getPhone());
        }

        // Các dòng theo thứ tự đã tạo: tiền phòng, điện, nước, dịch vụ, rồi dòng nhập tay
        List<InvoiceItemResponse> items = new ArrayList<>(response.getItems());
        items.sort(Comparator.comparing(
                InvoiceItemResponse::getId,
                Comparator.nullsLast(Comparator.naturalOrder())));
        response.setItems(items);

        response.setPayments(invoiceMapper.toPaymentResponses(
                paymentRepository
                        .findByInvoice_IdAndDeletedFalseOrderByPaymentDateDescIdDesc(
                                invoice.getId())));

        return response;
    }

    private PageResponse<InvoiceResponse> toInvoicePage(Page<Invoice> page) {
        Map<Long, ContractTenant> primaryTenants = loadPrimaryTenants(
                page.getContent().stream()
                        .map(invoice -> invoice.getContract().getId())
                        .distinct()
                        .toList());

        List<InvoiceResponse> items = page.getContent().stream()
                .map(invoice -> {
                    InvoiceResponse response = invoiceMapper.toInvoiceResponse(invoice);
                    ContractTenant primary =
                            primaryTenants.get(invoice.getContract().getId());
                    if (primary != null) {
                        response.setTenantName(primary.getTenant().getFullName());
                    }
                    return response;
                })
                .toList();

        return PageResponse.<InvoiceResponse>builder()
                .items(items)
                .currentPage(page.getNumber() + 1)
                .pageSize(page.getSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    // Khách đứng tên của từng hợp đồng (1 câu truy vấn cho cả trang)
    private Map<Long, ContractTenant> loadPrimaryTenants(List<Long> contractIds) {
        if (contractIds.isEmpty()) {
            return Map.of();
        }

        return invoiceRepository.findPrimaryContractTenants(contractIds).stream()
                .collect(Collectors.toMap(
                        link -> link.getContract().getId(),
                        Function.identity(),
                        (first, second) -> first
                ));
    }

    // page và size đã được controller validate (page >= 1, 1 <= size <= 100)
    private Pageable buildPageable(int page, int size) {
        return PageRequest.of(page - 1, size);
    }

    // Mẫu LIKE: chữ thường, escape \ % _ để người dùng gõ ký tự đó không bị hiểu là ký tự đại diện
    private String buildKeywordPattern(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return "%";
        }

        String escaped = keyword.trim()
                .toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");

        return "%" + escaped + "%";
    }

    private LocalDate today() {
        return LocalDate.now(VIETNAM_ZONE);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private BigDecimal toBigDecimal(Object value) {
        return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString());
    }

    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    // =========================================================
    // KIỂM TRA DỮ LIỆU
    // =========================================================

    private void validateBuildingId(Long buildingId) {
        if (buildingId != null && buildingId <= 0) {
            throw new AppException(ErrorCode.BUILDING_NOT_FOUND);
        }
    }

    // Thống kê bắt buộc có đủ tháng + năm
    private void requirePeriod(Integer month, Integer year) {
        if (month == null || year == null) {
            throw new AppException(ErrorCode.INVOICE_INVALID_PERIOD);
        }
        validateOptionalPeriod(month, year);
    }

    // Danh sách: tháng/năm tùy chọn, nhưng nếu có thì phải hợp lệ
    private void validateOptionalPeriod(Integer month, Integer year) {
        if (month != null && (month < 1 || month > 12)) {
            throw new AppException(ErrorCode.INVOICE_INVALID_PERIOD);
        }
        if (year != null && (year < 2000 || year > 2100)) {
            throw new AppException(ErrorCode.INVOICE_INVALID_PERIOD);
        }
    }

    // Kỳ lập hóa đơn: đủ tháng + năm hợp lệ và không nằm ở tương lai
    private YearMonth validateBillingPeriod(Integer month, Integer year) {
        requirePeriod(month, year);

        YearMonth period = YearMonth.of(year, month);
        if (period.isAfter(YearMonth.from(today()))) {
            throw new AppException(ErrorCode.INVOICE_INVALID_PERIOD);
        }

        return period;
    }

    private void validateDates(LocalDate issueDate, LocalDate dueDate) {
        if (issueDate == null || dueDate == null || dueDate.isBefore(issueDate)) {
            throw new AppException(ErrorCode.INVOICE_INVALID_DATES);
        }
    }

}
