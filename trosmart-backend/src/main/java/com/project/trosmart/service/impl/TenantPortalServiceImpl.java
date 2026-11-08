package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.ChangeMyPasswordRequest;
import com.project.trosmart.dto.request.IssueRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.dto.response.MyContractResponse.MyContractServiceResponse;
import com.project.trosmart.dto.response.MyContractResponse.MyContractTenantResponse;
import com.project.trosmart.dto.response.MyTenantDashboardResponse.RecentInvoice;
import com.project.trosmart.dto.response.MyTenantDashboardResponse.RecentIssue;
import com.project.trosmart.dto.response.MyTenantDashboardResponse.RecentNotification;
import com.project.trosmart.entity.*;
import com.project.trosmart.enums.*;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.repository.*;
import com.project.trosmart.service.TenantPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TenantPortalServiceImpl implements TenantPortalService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // Hóa đơn khách còn phải đóng
    private static final List<InvoiceStatus> OPEN_INVOICE_STATUSES = List.of(
            InvoiceStatus.UNPAID,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE
    );

    private static final List<IssueStatus> OPEN_ISSUE_STATUSES = List.of(
            IssueStatus.PENDING,
            IssueStatus.ACCEPTED,
            IssueStatus.IN_PROGRESS
    );

    private final TenantRepository tenantRepository;
    private final ContractRepository contractRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final IssueRepository issueRepository;
    private final NotificationRecipientRepository notificationRecipientRepository;
    private final TenantVehicleRepository tenantVehicleRepository;
    private final PasswordEncoder passwordEncoder;

    // =====================================================
    // 1. TỔNG QUAN
    // =====================================================

    @Override
    public MyTenantDashboardResponse getDashboard() {
        Tenant tenant = currentTenant();
        Long tenantId = tenant.getId();
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        Contract contract = findActiveContract(tenantId).orElse(null);

        // Hóa đơn cần đóng, đã xếp theo hạn gần nhất trước
        List<Invoice> open = invoiceRepository.findOpenByTenant(
                tenantId, OPEN_INVOICE_STATUSES);

        BigDecimal amountDue = open.stream()
                .map(Invoice::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Invoice nearest = open.isEmpty() ? null : open.get(0);

        Pageable top3 = PageRequest.of(0, 3);

        // 3 hóa đơn mới nhất
        List<RecentInvoice> recentInvoices = invoiceRepository
                .findVisibleByTenant(tenantId, top3)
                .getContent().stream()
                .map(i -> RecentInvoice.builder()
                        .id(i.getId())
                        .invoiceCode(i.getInvoiceCode())
                        .billingMonth(i.getBillingMonth())
                        .billingYear(i.getBillingYear())
                        .dueDate(i.getDueDate())
                        .totalAmount(i.getTotalAmount())
                        .remainingAmount(i.getRemainingAmount())
                        .status(i.getStatus())
                        .overdue(isOverdue(i, today))
                        .build())
                .toList();

        // 3 thông báo mới nhất
        List<RecentNotification> recentNotifications = notificationRecipientRepository
                .findMyNotifications(
                        tenantId,
                        NotificationStatus.SENT,
                        false,
                        List.of(NotificationType.values()),
                        top3)
                .getContent().stream()
                .map(r -> RecentNotification.builder()
                        .id(r.getNotification().getId())
                        .title(r.getNotification().getTitle())
                        .type(r.getNotification().getType())
                        .sentAt(r.getNotification().getSentAt())
                        .isRead(r.getIsRead())
                        .build())
                .toList();

        // 3 yêu cầu sửa chữa mới nhất
        List<RecentIssue> recentIssues = issueRepository
                .findByTenantIdAndDeletedFalse(
                        tenantId,
                        PageRequest.of(0, 3, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent().stream()
                .map(i -> RecentIssue.builder()
                        .id(i.getId())
                        .title(i.getTitle())
                        .status(i.getStatus())
                        .createdAt(i.getCreatedAt())
                        .build())
                .toList();

        return MyTenantDashboardResponse.builder()
                .fullName(tenant.getFullName())
                .roomNumber(contract == null ? null : contract.getRoom().getRoomNumber())
                .buildingName(contract == null ? null
                        : contract.getRoom().getBuilding().getName())
                .contractCode(contract == null ? null : contract.getContractCode())
                .contractStartDate(contract == null ? null : contract.getStartDate())
                .contractEndDate(contract == null ? null : contract.getEndDate())
                .daysToContractEnd(contract == null ? null
                        : ChronoUnit.DAYS.between(today, contract.getEndDate()))
                .rentPrice(contract == null ? null : contract.getRentPrice())
                .paymentDueDay(contract == null ? null : contract.getPaymentDueDay())
                .amountDue(amountDue)
                .unpaidInvoiceCount((long) open.size())
                .dueDate(nearest == null ? null : nearest.getDueDate())
                .latestInvoiceId(nearest == null ? null : nearest.getId())
                .openIssueCount(issueRepository.countByTenantIdAndDeletedFalseAndStatusIn(
                        tenantId, OPEN_ISSUE_STATUSES))
                .unreadNotificationCount(
                        notificationRecipientRepository.countMyUnread(
                                tenantId, NotificationStatus.SENT))
                .recentInvoices(recentInvoices)
                .recentNotifications(recentNotifications)
                .recentIssues(recentIssues)
                .build();
    }

    // =====================================================
    // 2. HỢP ĐỒNG, XE
    // =====================================================

    @Override
    public MyContractResponse getMyContract() {
        Tenant tenant = currentTenant();
        Contract contract = findActiveContract(tenant.getId())
                .orElseThrow(() -> new AppException(ErrorCode.CONTRACT_NOT_FOUND));
        return toMyContract(contract);
    }

    private MyContractResponse toMyContract(Contract c) {
        Room room = c.getRoom();

        List<MyContractTenantResponse> people = nullSafe(c.getContractTenants()).stream()
                .map(ct -> MyContractTenantResponse.builder()
                        .tenantId(ct.getTenant().getId())
                        .tenantName(ct.getTenant().getFullName())
                        .isPrimary(ct.getIsPrimary())
                        .build())
                // Người đứng tên hợp đồng xếp trước
                .sorted(Comparator.comparing(
                        (MyContractTenantResponse p) ->
                                !Boolean.TRUE.equals(p.getIsPrimary())))
                .toList();

        List<MyContractServiceResponse> services = nullSafe(c.getContractServices()).stream()
                .map(cs -> MyContractServiceResponse.builder()
                        .serviceId(cs.getServiceItem() != null
                                ? cs.getServiceItem().getId() : null)
                        .name(cs.getServiceName())
                        .price(cs.getUnitPrice())
                        .unit(cs.getUnit())
                        .billingType(cs.getServiceItem() != null
                                && cs.getServiceItem().getBillingType() != null
                                ? cs.getServiceItem().getBillingType().name() : null)
                        .build())
                .toList();

        List<String> amenities = room == null ? List.of()
                : nullSafe(room.getAmenities()).stream()
                .map(Amenity::getName)
                .filter(Objects::nonNull)
                .toList();

        return MyContractResponse.builder()
                .id(c.getId())
                .contractCode(c.getContractCode())
                .status(c.getStatus())
                .roomId(room != null ? room.getId() : null)
                .roomNumber(room != null ? room.getRoomNumber() : null)
                .buildingName(room != null && room.getBuilding() != null
                        ? room.getBuilding().getName() : null)
                .floor(room != null ? room.getFloor() : null)
                .area(room != null ? room.getArea() : null)
                .amenities(amenities)
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .rentPrice(c.getRentPrice())
                .deposit(c.getDeposit())
                .paymentDueDay(c.getPaymentDueDay())
                .paymentCycle(c.getPaymentCycle())
                .contractTenants(people)
                .contractServices(services)
                .build();
    }

    @Override
    public List<MyVehicleResponse> getMyVehicles() {
        Tenant tenant = currentTenant();

        return tenantVehicleRepository.findByTenantIdAndDeletedFalse(tenant.getId())
                .stream()
                .map(v -> MyVehicleResponse.builder()
                        .id(v.getId())
                        .vehicleType(v.getVehicleType())
                        .licensePlate(v.getLicensePlate())
                        .brand(v.getBrand())
                        .color(v.getColor())
                        .build())
                .toList();
    }

    // =====================================================
    // 3. HÓA ĐƠN
    // =====================================================

    @Override
    public PageResponse<MyInvoiceResponse> getMyInvoices(
            int page,
            int size,
            List<InvoiceStatus> statuses
    ) {
        Tenant tenant = currentTenant();

        // Không chọn trạng thái nào thì lấy tất cả
        List<InvoiceStatus> filter = (statuses == null || statuses.isEmpty())
                ? List.of(InvoiceStatus.values())
                : statuses;

        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        Page<Invoice> result = invoiceRepository.findVisibleByTenantAndStatuses(
                tenant.getId(), filter, PageRequest.of(page - 1, size));

        return toPage(result, invoice -> toInvoiceResponse(invoice, today));
    }

    @Override
    public MyInvoiceSummaryResponse getMyInvoiceSummary() {
        Tenant tenant = currentTenant();
        Long tenantId = tenant.getId();
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        // Số hóa đơn theo từng trạng thái
        Map<InvoiceStatus, Long> counts = new EnumMap<>(InvoiceStatus.class);
        for (Object[] row : invoiceRepository.countByTenantGroupByStatus(tenantId)) {
            counts.put((InvoiceStatus) row[0], (Long) row[1]);
        }

        long totalCount = counts.values().stream().mapToLong(Long::longValue).sum();
        long openCount = OPEN_INVOICE_STATUSES.stream()
                .mapToLong(st -> counts.getOrDefault(st, 0L))
                .sum();

        // Tiền còn nợ và số hóa đơn quá hạn tính từ danh sách hóa đơn còn phải đóng
        List<Invoice> open = invoiceRepository.findOpenByTenant(
                tenantId, OPEN_INVOICE_STATUSES);

        BigDecimal amountDue = open.stream()
                .map(Invoice::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long overdueCount = open.stream()
                .filter(invoice -> isOverdue(invoice, today))
                .count();

        return MyInvoiceSummaryResponse.builder()
                .totalCount(totalCount)
                .openCount(openCount)
                .overdueCount(overdueCount)
                .paidCount(counts.getOrDefault(InvoiceStatus.PAID, 0L))
                .amountDue(amountDue)
                .build();
    }

    @Override
    public MyInvoiceDetailResponse getMyInvoiceDetail(Long invoiceId) {
        Tenant tenant = currentTenant();

        // Không phải hóa đơn của khách này cũng trả "không tìm thấy", không lộ là có tồn tại
        Invoice invoice = invoiceRepository.findVisibleByIdAndTenant(
                        invoiceId, tenant.getId())
                .orElseThrow(() -> new AppException(ErrorCode.INVOICE_NOT_FOUND));

        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        List<MyInvoiceDetailResponse.Item> items = invoice.getDetails().stream()
                .sorted(Comparator.comparing(InvoiceItem::getId))
                .map(item -> MyInvoiceDetailResponse.Item.builder()
                        .id(item.getId())
                        .itemType(item.getItemType())
                        .itemName(item.getItemName())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .amount(item.getAmount())
                        .build())
                .toList();

        List<MyInvoiceDetailResponse.PaymentInfo> payments =
                paymentRepository
                        .findByInvoiceIdAndDeletedFalseOrderByPaymentDateDesc(invoice.getId())
                        .stream()
                        .map(p -> MyInvoiceDetailResponse.PaymentInfo.builder()
                                .id(p.getId())
                                .amount(p.getAmount())
                                .paymentMethod(p.getPaymentMethod())
                                .paymentDate(p.getPaymentDate())
                                .transactionCode(p.getTransactionCode())
                                .build())
                        .toList();

        return MyInvoiceDetailResponse.builder()
                .id(invoice.getId())
                .invoiceCode(invoice.getInvoiceCode())
                .billingMonth(invoice.getBillingMonth())
                .billingYear(invoice.getBillingYear())
                .issueDate(invoice.getIssueDate())
                .dueDate(invoice.getDueDate())
                .totalAmount(invoice.getTotalAmount())
                .paidAmount(invoice.getPaidAmount())
                .remainingAmount(invoice.getRemainingAmount())
                .status(invoice.getStatus())
                .overdue(isOverdue(invoice, today))
                .note(invoice.getNote())
                .items(items)
                .payments(payments)
                .build();
    }

    // =====================================================
    // 4. YÊU CẦU SỬA CHỮA
    // =====================================================

    @Override
    public PageResponse<MyIssueResponse> getMyIssues(int page, int size) {
        Tenant tenant = currentTenant();

        Pageable pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<Issue> issues = issueRepository.findByTenantIdAndDeletedFalse(
                tenant.getId(),
                pageable
        );

        return toPage(issues, this::toIssueResponse);
    }

    @Override
    @Transactional
    public MyIssueResponse createMyIssue(IssueRequest request) {
        Tenant tenant = currentTenant();

        // Chỉ khách đang có hợp đồng hiệu lực mới gửi được yêu cầu cho phòng của mình
        Contract contract = findActiveContract(tenant.getId())
                .orElseThrow(() -> new AppException(ErrorCode.ISSUE_ROOM_NOT_RENTED));

        if (contract.getRoom() == null) {
            throw new AppException(ErrorCode.ROOM_NOT_FOUND);
        }

        Issue issue = Issue.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .category(request.getCategory())
                .priority(request.getPriority())
                .status(IssueStatus.PENDING)
                .tenant(tenant)
                .room(contract.getRoom())
                .note(blankToNull(request.getNote()))
                .build();

        return toIssueResponse(issueRepository.save(issue));
    }

    @Override
    @Transactional
    public MyIssueResponse cancelMyIssue(Long issueId) {
        Tenant tenant = currentTenant();

        Issue issue = issueRepository.findById(issueId)
                .filter(i -> !Boolean.TRUE.equals(i.getDeleted()))
                .orElseThrow(() -> new AppException(ErrorCode.ISSUE_NOT_FOUND));

        if (!issue.getTenant().getId().equals(tenant.getId())) {
            throw new AppException(ErrorCode.ISSUE_TENANT_MISMATCH);
        }

        if (issue.getStatus() == IssueStatus.CANCELLED) {
            throw new AppException(ErrorCode.ISSUE_ALREADY_CANCELLED);
        }

        // Chủ trọ đã tiếp nhận thì khách không tự hủy được nữa
        if (issue.getStatus() != IssueStatus.PENDING) {
            throw new AppException(ErrorCode.ISSUE_CANNOT_CANCEL);
        }

        issue.setStatus(IssueStatus.CANCELLED);

        return toIssueResponse(issueRepository.save(issue));
    }

    private MyIssueResponse toIssueResponse(Issue issue) {
        return MyIssueResponse.builder()
                .id(issue.getId())
                .title(issue.getTitle())
                .description(issue.getDescription())
                .category(issue.getCategory())
                .priority(issue.getPriority())
                .note(issue.getNote())
                .status(issue.getStatus())
                .createdAt(issue.getCreatedAt())
                .build();
    }

    // =====================================================
    // 5. THÔNG BÁO
    // =====================================================

    @Override
    public PageResponse<MyNotificationResponse> getMyNotifications(
            int page,
            int size,
            boolean unreadOnly,
            List<NotificationType> types
    ) {
        Tenant tenant = currentTenant();

        // Không chọn loại nào thì lấy tất cả các loại
        Collection<NotificationType> filterTypes =
                (types == null || types.isEmpty())
                        ? List.of(NotificationType.values())
                        : types;

        Page<NotificationRecipient> result =
                notificationRecipientRepository.findMyNotifications(
                        tenant.getId(),
                        NotificationStatus.SENT,
                        unreadOnly,
                        filterTypes,
                        PageRequest.of(page - 1, size));

        return toPage(result, r -> {
            Notification n = r.getNotification();

            return MyNotificationResponse.builder()
                    .id(n.getId())
                    .title(n.getTitle())
                    .content(n.getContent())
                    .type(n.getType())
                    .priority(n.getPriority())
                    .sentAt(n.getSentAt())
                    .isRead(r.getIsRead())
                    .relatedId(n.getRelatedId())
                    .build();
        });
    }

    @Override
    public long getMyUnreadNotificationCount() {
        Tenant tenant = currentTenant();

        return notificationRecipientRepository.countMyUnread(
                tenant.getId(),
                NotificationStatus.SENT
        );
    }

    @Override
    @Transactional
    public void markNotificationRead(Long notificationId) {
        Tenant tenant = currentTenant();

        NotificationRecipient recipient = notificationRecipientRepository
                .findByNotificationIdAndTenantIdAndDeletedFalse(
                        notificationId, tenant.getId())
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));

        if (!Boolean.TRUE.equals(recipient.getIsRead())) {
            recipient.setIsRead(true);
            recipient.setReadAt(LocalDateTime.now(VIETNAM_ZONE));
        }
    }

    @Override
    @Transactional
    public void markAllNotificationsRead() {
        Tenant tenant = currentTenant();

        notificationRecipientRepository.markAllRead(
                tenant.getId(), LocalDateTime.now(VIETNAM_ZONE));
    }

    // =====================================================
    // 6. TÀI KHOẢN
    // =====================================================

    @Override
    public MyProfileResponse getMyProfile() {
        return toProfile(currentTenant());
    }

    @Override
    @Transactional
    public void changeMyPassword(ChangeMyPasswordRequest request) {
        Tenant tenant = currentTenant();
        User user = tenant.getUser();

        if (user == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.PASSWORD_CURRENT_INVALID);
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_CONFIRMATION_MISMATCH);
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.PASSWORD_SAME_AS_OLD);
        }

        // user đang được quản lý trong transaction nên tự lưu khi kết thúc
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
    }

    private String maskIdentity(String value) {
        if (value == null || value.length() < 8) return value;
        return value.substring(0, 4)
                + "*".repeat(value.length() - 8)
                + value.substring(value.length() - 4);
    }

    // =====================================================
    // 7. HỖ TRỢ
    // =====================================================

    /**
     * Khách đang đăng nhập. Tên đăng nhập lấy từ SecurityContext.
     * Nếu JWT của bạn lưu id người dùng thay vì username thì sửa lại ở đây.
     */
    private Tenant currentTenant() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        return tenantRepository
                .findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(ErrorCode.TENANT_NOT_FOUND));
    }

    private Optional<Contract> findActiveContract(Long tenantId) {
        return contractRepository
                .findByTenantAndStatus(tenantId, ContractStatus.ACTIVE)
                .stream()
                .findFirst();
    }

    private <T> Collection<T> nullSafe(Collection<T> source) {
        return source == null ? List.of() : source;
    }

    private boolean isOverdue(Invoice invoice, LocalDate today) {
        return OPEN_INVOICE_STATUSES.contains(invoice.getStatus())
                && invoice.getDueDate().isBefore(today);
    }

    private MyInvoiceResponse toInvoiceResponse(Invoice invoice, LocalDate today) {
        return MyInvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceCode(invoice.getInvoiceCode())
                .billingMonth(invoice.getBillingMonth())
                .billingYear(invoice.getBillingYear())
                .issueDate(invoice.getIssueDate())
                .dueDate(invoice.getDueDate())
                .totalAmount(invoice.getTotalAmount())
                .paidAmount(invoice.getPaidAmount())
                .remainingAmount(invoice.getRemainingAmount())
                .status(invoice.getStatus())
                .overdue(isOverdue(invoice, today))
                .build();
    }

    private MyProfileResponse toProfile(Tenant tenant) {
        User user = tenant.getUser();

        // Hợp đồng đang hiệu lực (null nếu khách chưa thuê phòng)
        Contract contract = findActiveContract(tenant.getId()).orElse(null);

        return MyProfileResponse.builder()
                .fullName(tenant.getFullName())
                .phone(tenant.getPhone())
                .email(tenant.getEmail())
                .dateOfBirth(tenant.getDateOfBirth())
                .gender(tenant.getGender())
                .identityNumber(maskIdentity(tenant.getIdentityNumber()))
                .permanentAddress(tenant.getPermanentAddress())
                .occupation(tenant.getOccupation())
                .rentalStatus(tenant.getRentalStatus())
                .username(user != null ? user.getUsername() : null)
                .createdAt(user != null ? user.getCreatedAt() : null)
                .roomNumber(contract != null ? contract.getRoom().getRoomNumber() : null)
                .buildingName(contract != null ? contract.getRoom().getBuilding().getName() : null)
                .build();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private <E, R> PageResponse<R> toPage(
            Page<E> page,
            java.util.function.Function<E, R> mapper
    ) {
        return PageResponse.<R>builder()
                .items(page.getContent().stream().map(mapper).toList())
                .currentPage(page.getNumber() + 1)
                .pageSize(page.getSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}