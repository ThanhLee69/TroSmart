package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.MeterReadingRequest;
import com.project.trosmart.dto.response.MeterReadingDetailResponse;
import com.project.trosmart.dto.response.MeterReadingHistoryResponse;
import com.project.trosmart.dto.response.MeterReadingResponse;
import com.project.trosmart.entity.Contract;
import com.project.trosmart.entity.ContractServiceItem;
import com.project.trosmart.entity.MeterReading;
import com.project.trosmart.enums.ServiceCode;
import org.mapstruct.*;

import java.math.BigDecimal;
import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface MeterReadingMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "room", ignore = true)
    @Mapping(target = "contract", ignore = true)
    @Mapping(target = "status", ignore = true)
    MeterReading toMeterReading(MeterReadingRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "room", ignore = true)
    @Mapping(target = "contract", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "billingMonth", ignore = true)
    @Mapping(target = "billingYear", ignore = true)
    void updateMeterReading(@MappingTarget MeterReading meterReading, MeterReadingRequest request);

    @Mapping(target = "roomId", source = "room.id")
    @Mapping(target = "roomNumber", source = "room.roomNumber")
    @Mapping(target = "buildingName", source = "room.building.name")
    MeterReadingResponse toMeterReadingResponse(MeterReading entity);

    List<MeterReadingResponse> toMeterReadingResponses(List<MeterReading> entities);

    @Mapping(target = "roomId", source = "room.id")
    @Mapping(target = "roomNumber", source = "room.roomNumber")
    @Mapping(target = "buildingName", source = "room.building.name")
    @Mapping(target = "contractCode", source = "contract.contractCode")
    @Mapping(target = "tenantName", source = "contract", qualifiedByName = "primaryTenantName")
    @Mapping(target = "electricityPrice", source = "contract", qualifiedByName = "electricityPrice")
    @Mapping(target = "waterPrice", source = "contract", qualifiedByName = "waterPrice")
    MeterReadingDetailResponse toMeterReadingDetailResponse(MeterReading entity);

    MeterReadingHistoryResponse toMeterReadingHistoryResponse(MeterReading entity);

    List<MeterReadingHistoryResponse> toMeterReadingHistoryResponses(List<MeterReading> entities);

    // Tên người đứng tên hợp đồng; bản ghi cũ chưa gắn hợp đồng thì trả null
    @Named("primaryTenantName")
    default String primaryTenantName(Contract contract) {
        if (contract == null || contract.getContractTenants() == null) {
            return null;
        }
        return contract.getContractTenants().stream()
                .filter(ct -> Boolean.TRUE.equals(ct.getIsPrimary()))   // <-- sửa nếu getter tên khác
                .map(ct -> ct.getTenant().getFullName())                // <-- sửa nếu field tên khác
                .findFirst()
                .orElse(null);
    }
    @Named("electricityPrice")
    default BigDecimal electricityPrice(Contract contract) {
        return getServicePrice(contract, ServiceCode.ELECTRICITY);
    }

    @Named("waterPrice")
    default BigDecimal waterPrice(Contract contract) {
        return getServicePrice(contract, ServiceCode.WATER);
    }

    default BigDecimal getServicePrice(Contract contract, ServiceCode serviceCode) {
        if (contract == null || contract.getContractServices() == null) {
            return BigDecimal.ZERO;
        }

        return contract.getContractServices().stream()
                .filter(item -> item.getServiceItem() != null)
                .filter(item -> item.getServiceItem().getServiceCode() == serviceCode)
                .map(ContractServiceItem::getUnitPrice)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }
}