package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.ContractRequest;
import com.project.trosmart.dto.response.ContractDetailResponse;
import com.project.trosmart.dto.response.ContractResponse;
import com.project.trosmart.entity.Contract;
import com.project.trosmart.entity.ContractServiceItem;
import com.project.trosmart.entity.ContractTenant;
import com.project.trosmart.entity.ServiceItem;
import com.project.trosmart.entity.Tenant;
import com.project.trosmart.util.ContractServiceRules;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Mapper(componentModel = "spring")
public interface ContractMapper {

    // Request -> Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "contractCode", ignore = true)
    @Mapping(target = "room", ignore = true)
    @Mapping(target = "contractTenants", ignore = true)
    @Mapping(target = "contractServices", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "actualEndDate", ignore = true)
    @Mapping(target = "terminationReason", ignore = true)
    Contract toEntity(ContractRequest request);

    // Entity -> Response rút gọn cho bảng danh sách
    @Mapping(target = "roomId", source = "room.id")
    @Mapping(target = "roomNumber", source = "room.roomNumber")
    @Mapping(target = "buildingName", source = "room.building.name")
    @Mapping(target = "tenantId", source = "contractTenants", qualifiedByName = "primaryTenantId")
    @Mapping(target = "tenantName", source = "contractTenants", qualifiedByName = "primaryTenantName")
    @Mapping(target = "tenantPhone", source = "contractTenants", qualifiedByName = "primaryTenantPhone")
    ContractResponse toResponse(Contract contract);

    // Cập nhật Entity từ Request
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "contractCode", ignore = true)
    @Mapping(target = "room", ignore = true)
    @Mapping(target = "contractTenants", ignore = true)
    @Mapping(target = "contractServices", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "actualEndDate", ignore = true)
    @Mapping(target = "terminationReason", ignore = true)
    void updateEntity(@MappingTarget Contract contract, ContractRequest request);

    // Entity -> Response chi tiết
    default ContractDetailResponse toDetailResponse(Contract contract) {
        if (contract == null) {
            return null;
        }

        Tenant primary = findPrimaryTenant(contract.getContractTenants());

        List<ContractDetailResponse.TenantItem> tenants =
                contract.getContractTenants() == null
                        ? List.of()
                        : contract.getContractTenants().stream()
                        .filter(ct -> !Boolean.TRUE.equals(ct.getDeleted()))
                        .map(this::toTenantItem)
                        // Người đang ở lên trước, đại diện đứng đầu
                        .sorted(Comparator
                                .comparing((ContractDetailResponse.TenantItem t) ->
                                        !Boolean.TRUE.equals(t.getActive()))
                                .thenComparing(t ->
                                        !Boolean.TRUE.equals(t.getIsPrimary())))
                        .toList();

        List<ContractDetailResponse.ServiceItem> services =
                contract.getContractServices() == null
                        ? List.of()
                        : contract.getContractServices().stream()
                        .map(this::toServiceItem)
                        .toList();

        return ContractDetailResponse.builder()
                .id(contract.getId())
                .contractCode(contract.getContractCode())
                .status(contract.getStatus())
                .roomId(contract.getRoom().getId())
                .roomNumber(contract.getRoom().getRoomNumber())
                .buildingId(contract.getRoom().getBuilding() != null
                        ? contract.getRoom().getBuilding().getId() : null)
                .buildingName(contract.getRoom().getBuilding() != null
                        ? contract.getRoom().getBuilding().getName() : null)
                .tenantId(primary != null ? primary.getId() : null)
                .tenantName(primary != null ? primary.getFullName() : null)
                .tenantPhone(primary != null ? primary.getPhone() : null)
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .actualEndDate(contract.getActualEndDate())
                .rentPrice(contract.getRentPrice())
                .deposit(contract.getDeposit())
                .paymentDueDay(contract.getPaymentDueDay())
                .paymentCycle(contract.getPaymentCycle())
                .notes(contract.getNotes())
                .terminationReason(contract.getTerminationReason())
                .contractTenants(tenants)
                .contractServices(services)
                .createdAt(contract.getCreatedAt())
                .updatedAt(contract.getUpdatedAt())
                .build();
    }

    default ContractDetailResponse.TenantItem toTenantItem(ContractTenant ct) {
        Tenant tenant = ct.getTenant();

        return ContractDetailResponse.TenantItem.builder()
                .id(ct.getId())
                .tenantId(tenant != null ? tenant.getId() : null)
                .fullName(tenant != null ? tenant.getFullName() : null)
                .phone(tenant != null ? tenant.getPhone() : null)
                .isPrimary(Boolean.TRUE.equals(ct.getIsPrimary()))
                .moveInDate(ct.getMoveInDate())
                .moveOutDate(ct.getMoveOutDate())
                .active(ct.getMoveOutDate() == null)
                .build();
    }

    default ContractDetailResponse.ServiceItem toServiceItem(ContractServiceItem item) {
        ServiceItem service = item.getServiceItem();

        return ContractDetailResponse.ServiceItem.builder()
                .id(item.getId())
                .serviceId(service != null ? service.getId() : null)
                .serviceCode(service != null ? service.getServiceCode() : null)
                .serviceName(item.getServiceName())
                .unit(item.getUnit())
                .billingType(service != null ? service.getBillingType() : null)
                .unitPrice(item.getUnitPrice())
                .removable(ContractServiceRules.isRemovable(item))
                .build();
    }

    @Named("primaryTenantId")
    default Long primaryTenantId(List<ContractTenant> contractTenants) {
        Tenant tenant = findPrimaryTenant(contractTenants);
        return tenant != null ? tenant.getId() : null;
    }

    @Named("primaryTenantName")
    default String primaryTenantName(List<ContractTenant> contractTenants) {
        Tenant tenant = findPrimaryTenant(contractTenants);
        return tenant != null ? tenant.getFullName() : null;
    }

    @Named("primaryTenantPhone")
    default String primaryTenantPhone(List<ContractTenant> contractTenants) {
        Tenant tenant = findPrimaryTenant(contractTenants);
        return tenant != null ? tenant.getPhone() : null;
    }

    default Tenant findPrimaryTenant(List<ContractTenant> contractTenants) {
        if (contractTenants == null || contractTenants.isEmpty()) {
            return null;
        }

        return contractTenants.stream()
                .filter(ct -> Boolean.TRUE.equals(ct.getIsPrimary()))
                .map(ContractTenant::getTenant)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
    }
}