package com.project.trosmart.pdf;

import com.project.trosmart.entity.Building;
import com.project.trosmart.entity.Contract;
import com.project.trosmart.entity.ContractServiceItem;
import com.project.trosmart.entity.ContractTenant;
import com.project.trosmart.entity.Room;
import com.project.trosmart.entity.Tenant;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.util.VietnameseNumberToWords;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanWrapper;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Chuyển hợp đồng (entity) thành dữ liệu đã định dạng để điền vào mẫu PDF.
 * Phải gọi trong transaction vì đọc các quan hệ LAZY (người thuê, dịch vụ, tòa nhà).
 */
@Component
@RequiredArgsConstructor
public class ContractPdfDataFactory {

    // Dấu chấm in thay cho thông tin chưa có, để viết tay sau khi in
    private static final String BLANK = "……………………";
    private static final String BLANK_SHORT = "………………";

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ContractPdfProperties landlordProperties;

    public ContractPdfData create(Contract contract) {
        Room room = contract.getRoom();
        Building building = room == null ? null : room.getBuilding();

        List<ContractTenant> activeLinks = contract.getContractTenants() == null
                ? List.of()
                : contract.getContractTenants().stream()
                .filter(link -> !Boolean.TRUE.equals(link.getDeleted()))
                // Người đã chuyển đi không còn ghi trong hợp đồng
                .filter(link -> link.getMoveOutDate() == null || contract.getStatus() == ContractStatus.TERMINATED)
                .toList();

        ContractTenant primaryLink = activeLinks.stream()
                .filter(link -> Boolean.TRUE.equals(link.getIsPrimary()))
                .findFirst()
                .orElse(null);

        List<ContractPdfData.CoTenantRow> coTenants = buildCoTenants(activeLinks);
        List<ContractPdfData.ServiceRow> services = buildServices(contract);

        LocalDate signDate = contract.getStartDate();

        return ContractPdfData.builder()
                .contractCode(contract.getContractCode())
                .banner(buildBanner(contract))

                .signPlace(building == null ? BLANK : orBlank(building.getAddress()))
                .signDay(pad(signDate.getDayOfMonth()))
                .signMonth(pad(signDate.getMonthValue()))
                .signYear(String.valueOf(signDate.getYear()))

                .landlord(landlordParty())
                .tenant(primaryLink == null ? emptyParty() : tenantParty(primaryLink.getTenant()))

                .roomNumber(room == null ? BLANK_SHORT : orBlank(room.getRoomNumber()))
                .floor(room == null || room.getFloor() == null ? BLANK_SHORT : String.valueOf(room.getFloor()))
                .area(room == null || room.getArea() == null ? BLANK_SHORT : room.getArea().stripTrailingZeros().toPlainString())
                .maxOccupancy(room == null || room.getMaxOccupancy() == null ? BLANK_SHORT : String.valueOf(room.getMaxOccupancy()))
                .buildingName(building == null ? BLANK : orBlank(building.getName()))
                .buildingAddress(building == null ? BLANK : fullAddress(building))

                .startDate(contract.getStartDate().format(DATE_FORMAT))
                .endDate(contract.getEndDate().format(DATE_FORMAT))
                .duration(duration(contract.getStartDate(), contract.getEndDate()))

                .rentPrice(money(contract.getRentPrice()))
                .rentPriceWords(moneyWords(contract.getRentPrice()))
                .deposit(money(contract.getDeposit()))
                .depositWords(moneyWords(contract.getDeposit()))

                .coTenants(coTenants)
                .services(services)
                .notes(contract.getNotes() == null || contract.getNotes().isBlank()
                        ? null
                        : contract.getNotes().trim())
                .build();
    }

    // =====================================================
    // CÁC PHẦN CỦA HỢP ĐỒNG
    // =====================================================

    private String buildBanner(Contract contract) {
        if (contract.getStatus() == ContractStatus.DRAFT) {
            return "BẢN NHÁP - CHƯA CÓ HIỆU LỰC";
        }

        if (contract.getStatus() == ContractStatus.TERMINATED) {
            String date = contract.getActualEndDate() == null
                    ? ""
                    : " ngày " + contract.getActualEndDate().format(DATE_FORMAT);

            return "HỢP ĐỒNG ĐÃ CHẤM DỨT" + date;
        }

        return null;
    }

    private List<ContractPdfData.CoTenantRow> buildCoTenants(List<ContractTenant> activeLinks) {
        List<ContractTenant> coLinks = activeLinks.stream()
                .filter(link -> !Boolean.TRUE.equals(link.getIsPrimary()))
                .sorted(Comparator.comparing(ContractTenant::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<ContractPdfData.CoTenantRow> rows = new ArrayList<>();

        for (int i = 0; i < coLinks.size(); i++) {
            ContractTenant link = coLinks.get(i);
            Tenant tenant = link.getTenant();

            rows.add(ContractPdfData.CoTenantRow.builder()
                    .index(i + 1)
                    .fullName(orBlank(read(tenant, "fullName", "name")))
                    .identityNumber(orBlank(read(tenant, "identityNumber", "idNumber", "citizenId", "cccd", "nationalId")))
                    .phone(orBlank(read(tenant, "phone", "phoneNumber")))
                    .moveInDate(link.getMoveInDate() == null ? BLANK_SHORT : link.getMoveInDate().format(DATE_FORMAT))
                    .build());
        }

        return rows;
    }

    private List<ContractPdfData.ServiceRow> buildServices(Contract contract) {
        if (contract.getContractServices() == null) {
            return List.of();
        }

        List<ContractServiceItem> items = contract.getContractServices().stream()
                .sorted(Comparator.comparing(ContractServiceItem::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<ContractPdfData.ServiceRow> rows = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            ContractServiceItem item = items.get(i);

            rows.add(ContractPdfData.ServiceRow.builder()
                    .index(i + 1)
                    .name(orBlank(item.getServiceName()))
                    .unit(item.getUnit() == null ? "" : String.valueOf(item.getUnit()))
                    .unitPrice(money(item.getUnitPrice()))
                    .build());
        }

        return rows;
    }

    // =====================================================
    // HAI BÊN
    // =====================================================

    private ContractPdfData.Party landlordParty() {
        return ContractPdfData.Party.builder()
                .fullName(orBlank(landlordProperties.getFullName()))
                .birthDate(orBlankShort(landlordProperties.getBirthDate()))
                .identityNumber(orBlankShort(landlordProperties.getIdentityNumber()))
                .identityIssuedDate(orBlankShort(landlordProperties.getIdentityIssuedDate()))
                .identityIssuedPlace(orBlank(landlordProperties.getIdentityIssuedPlace()))
                .phone(orBlankShort(landlordProperties.getPhone()))
                .address(orBlank(landlordProperties.getAddress()))
                .build();
    }

    private ContractPdfData.Party emptyParty() {
        return ContractPdfData.Party.builder()
                .fullName(BLANK).birthDate(BLANK_SHORT).identityNumber(BLANK_SHORT)
                .identityIssuedDate(BLANK_SHORT).identityIssuedPlace(BLANK)
                .phone(BLANK_SHORT).address(BLANK)
                .build();
    }

    /**
     * Thông tin người thuê. Các tên trường của entity Tenant được thử lần lượt
     * (read bên dưới), trường nào không có thì in dấu chấm, không báo lỗi.
     * Khi đã chắc tên trường, có thể thay bằng getter trực tiếp, ví dụ tenant.getFullName().
     */
    private ContractPdfData.Party tenantParty(Tenant tenant) {
        return ContractPdfData.Party.builder()
                .fullName(orBlank(read(tenant, "fullName", "name")))
                .birthDate(orBlankShort(read(tenant, "dateOfBirth", "birthDate", "dob")))
                .identityNumber(orBlankShort(read(tenant, "identityNumber", "idNumber", "citizenId", "cccd", "nationalId")))
                .identityIssuedDate(orBlankShort(read(tenant, "identityIssuedDate", "issuedDate", "idIssuedDate", "issueDate")))
                // Nơi cấp CCCD dùng chung giá trị với chủ trọ (app.contract.landlord.identity-issued-place)
                .identityIssuedPlace(orBlank(landlordProperties.getIdentityIssuedPlace()))
                .phone(orBlankShort(read(tenant, "phone", "phoneNumber")))
                .address(orBlank(read(tenant, "permanentAddress", "address", "residenceAddress")))
                .build();
    }

    /** Đọc thuộc tính đầu tiên có trong bean, trả về chuỗi đã định dạng (ngày dạng dd/MM/yyyy). */
    private String read(Object bean, String... propertyNames) {
        if (bean == null) {
            return null;
        }

        BeanWrapper wrapper = new BeanWrapperImpl(bean);

        for (String name : propertyNames) {
            if (!wrapper.isReadableProperty(name)) {
                continue;
            }

            Object value = wrapper.getPropertyValue(name);

            if (value == null) {
                continue;
            }

            if (value instanceof LocalDate date) {
                return date.format(DATE_FORMAT);
            }

            String text = String.valueOf(value).trim();

            if (!text.isEmpty()) {
                return text;
            }
        }

        return null;
    }

    // =====================================================
    // ĐỊNH DẠNG
    // =====================================================

    // 3500000 thành "3.500.000" (kiểu Việt Nam, dùng dấu chấm ngăn cách hàng nghìn)
    private String money(BigDecimal amount) {
        if (amount == null) {
            return "0";
        }

        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.US);
        symbols.setGroupingSeparator('.');

        return new DecimalFormat("#,##0", symbols).format(amount);
    }

    private String moneyWords(BigDecimal amount) {
        return VietnameseNumberToWords.moneyToWords(amount == null ? 0 : amount.longValue());
    }

    // "12 tháng", "6 tháng 15 ngày", "20 ngày"
    private String duration(LocalDate start, LocalDate end) {
        // Hợp đồng tính cả ngày kết thúc: 01/01 đến 31/12 là đủ 12 tháng
        Period period = Period.between(start, end.plusDays(1));

        int months = period.getYears() * 12 + period.getMonths();
        int days = period.getDays();

        List<String> parts = new ArrayList<>();

        if (months > 0) {
            parts.add(months + " tháng");
        }

        if (days > 0) {
            parts.add(days + " ngày");
        }

        return parts.isEmpty() ? "0 ngày" : String.join(" ", parts);
    }

    private String fullAddress(Building building) {
        String address = java.util.stream.Stream.of(building.getAddress(), building.getWard(), building.getProvince())
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(text -> !text.isEmpty())
                .collect(Collectors.joining(", "));

        return address.isEmpty() ? BLANK : address;
    }

    private String pad(int value) {
        return String.format("%02d", value);
    }

    private String orBlank(String value) {
        return value == null || value.isBlank() ? BLANK : value.trim();
    }

    private String orBlankShort(String value) {
        return value == null || value.isBlank() ? BLANK_SHORT : value.trim();
    }
}