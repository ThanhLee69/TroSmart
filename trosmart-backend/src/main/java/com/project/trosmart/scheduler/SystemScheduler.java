package com.project.trosmart.scheduler;

import com.project.trosmart.entity.Contract;
import com.project.trosmart.entity.ContractTenant;
import com.project.trosmart.entity.Invoice;
import com.project.trosmart.entity.Tenant;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.TenantRentalStatus;
import com.project.trosmart.repository.ContractRepository;
import com.project.trosmart.repository.InvoiceRepository;
import com.project.trosmart.repository.RoomRepository;
import com.project.trosmart.repository.TenantRepository;
import com.project.trosmart.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

// Gom các tác vụ tự động theo thời gian của hệ thống (hợp đồng, hóa đơn, thông báo).
// Không cần interface: không nơi nào khác gọi, chỉ Spring chạy theo lịch.
@Component
@RequiredArgsConstructor
@Slf4j(topic = "SYSTEM-SCHEDULER")
public class SystemScheduler {

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private final ContractRepository contractRepository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;
    private final InvoiceRepository invoiceRepository;
    private final NotificationService notificationService;

    // =========================================================
    // HỢP ĐỒNG
    // =========================================================

    /**
     * Kiểm tra hợp đồng đến ngày bắt đầu.
     * Chạy khi BE khởi động và lặp lại mỗi 10 giây.
     */
    @Scheduled(initialDelay = 0, fixedDelay = 10000)
    @Transactional
    public void activateContracts() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        List<Contract> contracts =
                contractRepository.findContractsToActivate(
                        ContractStatus.DRAFT,
                        today
                );

        int activatedCount = 0;

        for (Contract contract : contracts) {
            // Bỏ qua hợp đồng đã bị xóa mềm.
            if (Boolean.TRUE.equals(contract.getDeleted())) {
                continue;
            }

            contract.setStatus(ContractStatus.ACTIVE);

            if (contract.getRoom() != null) {
                contract.getRoom().setStatus(RoomStatus.OCCUPIED);
                roomRepository.save(contract.getRoom());
            }

            if (contract.getContractTenants() != null) {
                for (ContractTenant link : contract.getContractTenants()) {
                    // Bỏ qua liên kết khách thuê đã bị xóa mềm.
                    if (Boolean.TRUE.equals(link.getDeleted())) {
                        continue;
                    }

                    Tenant tenant = link.getTenant();

                    if (tenant != null
                            && !Boolean.TRUE.equals(tenant.getDeleted())) {
                        tenant.setRentalStatus(TenantRentalStatus.RENTING);
                        tenantRepository.save(tenant);
                    }
                }
            }

            activatedCount++;
        }

        contractRepository.saveAll(contracts);

        if (activatedCount > 0) {
            log.info(
                    "Đã kích hoạt {} hợp đồng đến hạn",
                    activatedCount
            );
        }
    }

    /**
     * Chuyển hợp đồng đã qua ngày kết thúc sang EXPIRED.
     */
    @Scheduled(initialDelay = 0, fixedDelay = 10000)
    @Transactional
    public void expireContracts() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        List<Contract> contracts =
                contractRepository.findContractsToExpire(
                        ContractStatus.ACTIVE,
                        today
                );

        for (Contract contract : contracts) {
            contract.setStatus(ContractStatus.EXPIRED);
        }

        contractRepository.saveAll(contracts);

        if (!contracts.isEmpty()) {
            log.info(
                    "Đã cập nhật {} hợp đồng hết hạn",
                    contracts.size()
            );
        }
    }

    /**
     * Kiểm tra hợp đồng còn đúng 30 ngày sẽ hết hạn, chạy 8h sáng mỗi ngày.
     * Chỉ ghi log, chưa gửi thông báo thực tế.
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional(readOnly = true)
    public void sendContractExpirationReminders() {
        LocalDate expirationDate =
                LocalDate.now(VIETNAM_ZONE).plusDays(30);

        List<Contract> contracts =
                contractRepository.findContractsToRemind(
                        ContractStatus.ACTIVE,
                        expirationDate
                );

        for (Contract contract : contracts) {
            log.info(
                    "Hợp đồng {} sắp hết hạn vào {}",
                    contract.getContractCode(),
                    contract.getEndDate()
            );
        }
    }

    // =========================================================
    // HÓA ĐƠN
    // =========================================================

    /**
     * Hóa đơn đã qua hạn thanh toán mà còn nợ chuyển sang OVERDUE.
     * Chạy khi BE khởi động và lặp lại mỗi giờ.
     */
    @Scheduled(initialDelay = 0, fixedDelay = 3_600_000)
    @Transactional
    public void markOverdueInvoices() {
        List<Invoice> invoices = invoiceRepository.findInvoicesToMarkOverdue(
                List.of(InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID),
                LocalDate.now(VIETNAM_ZONE)
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

    // =========================================================
    // THÔNG BÁO
    // =========================================================

    /**
     * Gửi các thông báo đã hẹn giờ và đến hạn, kiểm tra mỗi phút.
     */
    @Scheduled(initialDelay = 30_000, fixedDelay = 60_000)
    public void sendScheduledNotifications() {
        notificationService.sendScheduledNotifications();
    }
}