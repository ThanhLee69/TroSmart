package com.project.trosmart.service.impl;

import com.project.trosmart.dto.response.DashboardRevenueResponse;
import com.project.trosmart.dto.response.DashboardSummaryResponse;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.IssueStatus;
import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.ContactStatus;
import com.project.trosmart.service.DashboardService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    // Hợp đồng sắp hết hạn: trong vòng bao nhiêu ngày tới
    private static final int EXPIRING_DAYS = 30;

    // Số dòng ở mỗi bảng ngắn
    private static final int TABLE_LIMIT = 5;

    // Hóa đơn còn nợ (chưa trả đủ, chưa hủy)
    private static final List<InvoiceStatus> OPEN_STATUSES = List.of(
            InvoiceStatus.UNPAID,
            InvoiceStatus.PARTIALLY_PAID,
            InvoiceStatus.OVERDUE
    );

    private final EntityManager entityManager;

    // =====================================================
    // TỔNG QUAN
    // =====================================================

    @Override
    public DashboardSummaryResponse getSummary(Long buildingId) {
        LocalDate today = LocalDate.now();

        // ----- Phòng theo tòa nhà (lấy tất cả tòa để làm bộ lọc, rồi cộng lại theo bộ lọc) -----
        List<DashboardSummaryResponse.BuildingRooms> buildings = loadBuildings();

        long rented = 0;
        long reserved = 0;
        long available = 0;
        long maintenance = 0;

        for (DashboardSummaryResponse.BuildingRooms b : buildings) {
            if (buildingId != null && !buildingId.equals(b.getId())) {
                continue;
            }
            rented += b.getRented();
            reserved += b.getReserved();
            available += b.getAvailable();
            maintenance += b.getMaintenance();
        }

        DashboardSummaryResponse.Occupancy occupancy = DashboardSummaryResponse.Occupancy.builder()
                .total(rented + reserved + available + maintenance)
                .rented(rented)
                .reserved(reserved)
                .available(available)
                .maintenance(maintenance)
                .build();

        // ----- Tiền phòng tháng này -----
        Object[] monthRow = query(
                "select sum(i.totalAmount), sum(i.paidAmount) "
                        + "from Invoice i join i.contract c join c.room r join r.building b "
                        + "where i.deleted = false and i.status <> :cancelled "
                        + "and i.billingYear = :y and i.billingMonth = :m" + buildingClause(buildingId),
                Object[].class, buildingId)
                .setParameter("cancelled", InvoiceStatus.CANCELLED)
                .setParameter("y", today.getYear())
                .setParameter("m", today.getMonthValue())
                .getSingleResult();

        DashboardSummaryResponse.MonthRevenue month = DashboardSummaryResponse.MonthRevenue.builder()
                .expected(toBig(monthRow[0]))
                .collected(toBig(monthRow[1]))
                .build();

        // ----- Công nợ -----
        Object[] debtRow = query(
                "select sum(i.remainingAmount), count(i) "
                        + "from Invoice i join i.contract c join c.room r join r.building b "
                        + "where i.deleted = false and i.status in :open" + buildingClause(buildingId),
                Object[].class, buildingId)
                .setParameter("open", OPEN_STATUSES)
                .getSingleResult();

        long overdueCount = count(
                "select count(i) from Invoice i join i.contract c join c.room r join r.building b "
                        + "where i.deleted = false and i.status in :open and i.dueDate < :today"
                        + buildingClause(buildingId),
                buildingId, Map.of("open", OPEN_STATUSES, "today", today));

        DashboardSummaryResponse.Debt debt = DashboardSummaryResponse.Debt.builder()
                .amount(toBig(debtRow[0]))
                .overdueCount(overdueCount)
                .build();

        // ----- Việc cần xử lý -----
        long pendingIssues = count(
                "select count(i) from Issue i join i.room r join r.building b "
                        + "where i.deleted = false and i.status = :pending" + buildingClause(buildingId),
                buildingId, Map.of("pending", IssueStatus.PENDING));

        long expiring = count(
                "select count(c) from Contract c join c.room r join r.building b "
                        + "where c.deleted = false and c.status = :active "
                        + "and c.endDate between :from and :to" + buildingClause(buildingId),
                buildingId, Map.of(
                        "active", ContractStatus.ACTIVE,
                        "from", today,
                        "to", today.plusDays(EXPIRING_DAYS)));

        long metersMissing = countRoomsWithoutMeter(buildingId, today);

        // Liên hệ không thuộc tòa nhà nào nên luôn đếm toàn bộ
        long newContacts = count(
                "select count(m) from ContactMessage m where m.deleted = false and m.status = :status",
                null, Map.of("status", ContactStatus.NEW));

        List<DashboardSummaryResponse.TodoItem> todo = List.of(
                todo("overdue", "Hóa đơn quá hạn", overdueCount, "danger", "invoice"),
                todo("issue", "Yêu cầu sửa chữa chờ xử lý", pendingIssues, "danger", "issue"),
                todo("expiring", "Hợp đồng sắp hết hạn (" + EXPIRING_DAYS + " ngày)", expiring, "warning", "contract"),
                todo("meter", "Phòng chưa ghi điện nước tháng này", metersMissing, "warning", "meter"),
                todo("contact", "Liên hệ mới từ website", newContacts, "info", "contact")
        );

        return DashboardSummaryResponse.builder()
                .occupancy(occupancy)
                .month(month)
                .debt(debt)
                .todo(todo)
                .buildings(buildings)
                .overdueInvoices(loadOverdueInvoices(buildingId, today))
                .expiringContracts(loadExpiringContracts(buildingId, today))
                .build();
    }

    // =====================================================
    // DOANH THU
    // =====================================================

    @Override
    public DashboardRevenueResponse getRevenue(String mode, Integer year, Long buildingId) {
        LocalDate today = LocalDate.now();

        if ("last12".equalsIgnoreCase(mode)) {
            return revenueLast12(today, buildingId);
        }

        int y = year != null ? year : today.getYear();
        return revenueOfYear(y, today, buildingId);
    }

    // Đủ 12 tháng của một năm; tháng chưa tới để null
    private DashboardRevenueResponse revenueOfYear(int year, LocalDate today, Long buildingId) {
        List<Object[]> data = query(
                "select i.billingMonth, sum(i.totalAmount), sum(i.paidAmount), count(i) "
                        + "from Invoice i join i.contract c join c.room r join r.building b "
                        + "where i.deleted = false and i.status <> :cancelled and i.billingYear = :y"
                        + buildingClause(buildingId) + " group by i.billingMonth",
                Object[].class, buildingId)
                .setParameter("cancelled", InvoiceStatus.CANCELLED)
                .setParameter("y", year)
                .getResultList();

        Map<Integer, Object[]> byMonth = new HashMap<>();
        for (Object[] row : data) {
            byMonth.put(((Number) row[0]).intValue(), row);
        }

        List<DashboardRevenueResponse.Row> rows = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            boolean future = year > today.getYear()
                    || (year == today.getYear() && m > today.getMonthValue());

            if (future) {
                rows.add(DashboardRevenueResponse.Row.builder().label("T" + m).build());
                continue;
            }

            Object[] row = byMonth.get(m);
            rows.add(DashboardRevenueResponse.Row.builder()
                    .label("T" + m)
                    .expected(row == null ? BigDecimal.ZERO : toBig(row[1]))
                    .collected(row == null ? BigDecimal.ZERO : toBig(row[2]))
                    .invoices(row == null ? 0 : ((Number) row[3]).longValue())
                    .build());
        }

        // Tổng đã thu của năm trước để so sánh
        BigDecimal previous = query(
                "select sum(i.paidAmount) "
                        + "from Invoice i join i.contract c join c.room r join r.building b "
                        + "where i.deleted = false and i.status <> :cancelled and i.billingYear = :y"
                        + buildingClause(buildingId),
                BigDecimal.class, buildingId)
                .setParameter("cancelled", InvoiceStatus.CANCELLED)
                .setParameter("y", year - 1)
                .getSingleResult();

        BigDecimal previousTotal = toBig(previous);

        return DashboardRevenueResponse.builder()
                .rows(rows)
                .previousTotal(previousTotal.signum() > 0 ? previousTotal : null)
                .build();
    }

    // 12 tháng gần nhất, tính cả tháng hiện tại
    private DashboardRevenueResponse revenueLast12(LocalDate today, Long buildingId) {
        LocalDate first = today.withDayOfMonth(1).minusMonths(11);
        int fromKey = first.getYear() * 12 + first.getMonthValue();
        int toKey = today.getYear() * 12 + today.getMonthValue();

        List<Object[]> data = query(
                "select i.billingYear, i.billingMonth, sum(i.totalAmount), sum(i.paidAmount), count(i) "
                        + "from Invoice i join i.contract c join c.room r join r.building b "
                        + "where i.deleted = false and i.status <> :cancelled "
                        + "and (i.billingYear * 12 + i.billingMonth) between :fromKey and :toKey"
                        + buildingClause(buildingId) + " group by i.billingYear, i.billingMonth",
                Object[].class, buildingId)
                .setParameter("cancelled", InvoiceStatus.CANCELLED)
                .setParameter("fromKey", fromKey)
                .setParameter("toKey", toKey)
                .getResultList();

        Map<Integer, Object[]> byKey = new HashMap<>();
        for (Object[] row : data) {
            byKey.put(((Number) row[0]).intValue() * 12 + ((Number) row[1]).intValue(), row);
        }

        List<DashboardRevenueResponse.Row> rows = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            LocalDate d = first.plusMonths(i);
            Object[] row = byKey.get(d.getYear() * 12 + d.getMonthValue());

            rows.add(DashboardRevenueResponse.Row.builder()
                    .label("T" + d.getMonthValue())
                    .sub(String.valueOf(d.getYear()).substring(2))
                    .expected(row == null ? BigDecimal.ZERO : toBig(row[2]))
                    .collected(row == null ? BigDecimal.ZERO : toBig(row[3]))
                    .invoices(row == null ? 0 : ((Number) row[4]).longValue())
                    .build());
        }

        return DashboardRevenueResponse.builder().rows(rows).build();
    }

    // =====================================================
    // CÁC TRUY VẤN CON
    // =====================================================

    // Số phòng theo trạng thái của từng tòa nhà
    private List<DashboardSummaryResponse.BuildingRooms> loadBuildings() {
        List<Object[]> buildingRows = entityManager
                .createQuery("select b.id, b.name from Building b where b.deleted = false order by b.name",
                        Object[].class)
                .getResultList();

        List<Object[]> roomRows = entityManager
                .createQuery("select b.id, r.status, count(r) from Room r join r.building b "
                                + "where r.deleted = false and b.deleted = false group by b.id, r.status",
                        Object[].class)
                .getResultList();

        // buildingId -> (status -> số phòng)
        Map<Long, Map<RoomStatus, Long>> counts = new HashMap<>();
        for (Object[] row : roomRows) {
            counts.computeIfAbsent((Long) row[0], k -> new HashMap<>())
                    .put((RoomStatus) row[1], ((Number) row[2]).longValue());
        }

        List<DashboardSummaryResponse.BuildingRooms> result = new ArrayList<>();
        for (Object[] row : buildingRows) {
            Map<RoomStatus, Long> c = counts.getOrDefault((Long) row[0], Map.of());

            result.add(DashboardSummaryResponse.BuildingRooms.builder()
                    .id((Long) row[0])
                    .name((String) row[1])
                    .rented(c.getOrDefault(RoomStatus.OCCUPIED, 0L))
                    .reserved(c.getOrDefault(RoomStatus.RESERVED, 0L))
                    .available(c.getOrDefault(RoomStatus.AVAILABLE, 0L))
                    .maintenance(c.getOrDefault(RoomStatus.MAINTENANCE, 0L))
                    .build());
        }
        return result;
    }

    // Phòng đang có hợp đồng hiệu lực nhưng tháng này chưa ghi đủ điện và nước
    private long countRoomsWithoutMeter(Long buildingId, LocalDate today) {
        List<Long> rentedRoomIds = query(
                "select distinct r.id from Contract c join c.room r join r.building b "
                        + "where c.deleted = false and c.status = :active and r.deleted = false"
                        + buildingClause(buildingId),
                Long.class, buildingId)
                .setParameter("active", ContractStatus.ACTIVE)
                .getResultList();

        if (rentedRoomIds.isEmpty()) {
            return 0;
        }

        List<Long> recorded = entityManager
                .createQuery("select distinct m.room.id from MeterReading m "
                        + "where m.deleted = false and m.billingYear = :y and m.billingMonth = :m "
                        + "and m.electricityEnd is not null and m.waterEnd is not null", Long.class)
                .setParameter("y", today.getYear())
                .setParameter("m", today.getMonthValue())
                .getResultList();

        Set<Long> recordedSet = recorded.stream().collect(Collectors.toSet());

        return rentedRoomIds.stream().filter(id -> !recordedSet.contains(id)).count();
    }

    // Hóa đơn quá hạn lâu nhất (hạn thanh toán sớm nhất trước)
    private List<DashboardSummaryResponse.OverdueInvoice> loadOverdueInvoices(Long buildingId, LocalDate today) {
        List<Object[]> rows = query(
                "select i.id, r.roomNumber, b.name, i.remainingAmount, i.dueDate, "
                        + "(select min(t.fullName) from ContractTenant ct join ct.tenant t "
                        + " where ct.contract.id = c.id and ct.isPrimary = true and ct.deleted = false) "
                        + "from Invoice i join i.contract c join c.room r join r.building b "
                        + "where i.deleted = false and i.status in :open and i.dueDate < :today"
                        + buildingClause(buildingId) + " order by i.dueDate asc",
                Object[].class, buildingId)
                .setParameter("open", OPEN_STATUSES)
                .setParameter("today", today)
                .setMaxResults(TABLE_LIMIT)
                .getResultList();

        List<DashboardSummaryResponse.OverdueInvoice> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(DashboardSummaryResponse.OverdueInvoice.builder()
                    .id((Long) row[0])
                    .room((String) row[1])
                    .building((String) row[2])
                    .amount(toBig(row[3]))
                    .days(ChronoUnit.DAYS.between((LocalDate) row[4], today))
                    .tenant(row[5] == null ? "" : (String) row[5])
                    .build());
        }
        return result;
    }

    // Hợp đồng sắp hết hạn (ngày hết hạn gần nhất trước)
    private List<DashboardSummaryResponse.ExpiringContract> loadExpiringContracts(Long buildingId, LocalDate today) {
        List<Object[]> rows = query(
                "select c.id, r.roomNumber, b.name, c.endDate, "
                        + "(select min(t.fullName) from ContractTenant ct join ct.tenant t "
                        + " where ct.contract.id = c.id and ct.isPrimary = true and ct.deleted = false) "
                        + "from Contract c join c.room r join r.building b "
                        + "where c.deleted = false and c.status = :active "
                        + "and c.endDate between :from and :to"
                        + buildingClause(buildingId) + " order by c.endDate asc",
                Object[].class, buildingId)
                .setParameter("active", ContractStatus.ACTIVE)
                .setParameter("from", today)
                .setParameter("to", today.plusDays(EXPIRING_DAYS))
                .setMaxResults(TABLE_LIMIT)
                .getResultList();

        List<DashboardSummaryResponse.ExpiringContract> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(DashboardSummaryResponse.ExpiringContract.builder()
                    .id((Long) row[0])
                    .room((String) row[1])
                    .building((String) row[2])
                    .endDate((LocalDate) row[3])
                    .days(ChronoUnit.DAYS.between(today, (LocalDate) row[3]))
                    .tenant(row[4] == null ? "" : (String) row[4])
                    .build());
        }
        return result;
    }

    // =====================================================
    // HELPER
    // =====================================================

    // Điều kiện lọc theo tòa nhà (alias b là Building)
    private String buildingClause(Long buildingId) {
        return buildingId != null ? " and b.id = :buildingId" : "";
    }

    // Tạo query có kiểu kết quả rõ ràng và gắn tham số tòa nhà nếu có
    private <T> TypedQuery<T> query(String jpql, Class<T> type, Long buildingId) {
        TypedQuery<T> query = entityManager.createQuery(jpql, type);
        if (buildingId != null) {
            query.setParameter("buildingId", buildingId);
        }
        return query;
    }

    private long count(String jpql, Long buildingId, Map<String, Object> params) {
        TypedQuery<Long> query = query(jpql, Long.class, buildingId);
        params.forEach(query::setParameter);
        return query.getSingleResult();
    }

    private BigDecimal toBig(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal big) {
            return big;
        }
        return BigDecimal.valueOf(((Number) value).doubleValue());
    }

    private DashboardSummaryResponse.TodoItem todo(String key, String label, long count, String tone, String path) {
        return DashboardSummaryResponse.TodoItem.builder()
                .key(key)
                .label(label)
                .count(count)
                .tone(tone)
                .path(path)
                .build();
    }
}