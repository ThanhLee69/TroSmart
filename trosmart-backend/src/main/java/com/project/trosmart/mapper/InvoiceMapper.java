package com.project.trosmart.mapper;

import com.project.trosmart.dto.response.InvoiceDetailResponse;
import com.project.trosmart.dto.response.InvoiceItemResponse;
import com.project.trosmart.dto.response.InvoiceResponse;
import com.project.trosmart.dto.response.PaymentResponse;
import com.project.trosmart.entity.Invoice;
import com.project.trosmart.entity.InvoiceItem;
import com.project.trosmart.entity.Payment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface InvoiceMapper {

    // tenantName do service gán (lấy từ khách đứng tên hợp đồng)
    @Mapping(target = "contractId", source = "contract.id")
    @Mapping(target = "contractCode", source = "contract.contractCode")
    @Mapping(target = "roomNumber", source = "contract.room.roomNumber")
    @Mapping(target = "buildingName", source = "contract.room.building.name")
    @Mapping(target = "tenantName", ignore = true)
    InvoiceResponse toInvoiceResponse(Invoice invoice);

    // tenantName, tenantPhone, payments do service gán
    @Mapping(target = "contractId", source = "contract.id")
    @Mapping(target = "contractCode", source = "contract.contractCode")
    @Mapping(target = "roomId", source = "contract.room.id")
    @Mapping(target = "roomNumber", source = "contract.room.roomNumber")
    @Mapping(target = "buildingName", source = "contract.room.building.name")
    @Mapping(target = "tenantName", ignore = true)
    @Mapping(target = "tenantPhone", ignore = true)
    @Mapping(target = "electricityStart", source = "meterReading.electricityStart")
    @Mapping(target = "electricityEnd", source = "meterReading.electricityEnd")
    @Mapping(target = "waterStart", source = "meterReading.waterStart")
    @Mapping(target = "waterEnd", source = "meterReading.waterEnd")
    @Mapping(target = "items", source = "details")
    @Mapping(target = "payments", ignore = true)
    @Mapping(target = "cancelledAt", expression =
            "java(invoice.getStatus() == com.project.trosmart.enums.InvoiceStatus.CANCELLED ? invoice.getUpdatedAt() : null)")
    @Mapping(target = "cancelledBy", expression =
            "java(invoice.getStatus() == com.project.trosmart.enums.InvoiceStatus.CANCELLED ? invoice.getUpdatedBy() : null)")
    InvoiceDetailResponse toInvoiceDetailResponse(Invoice invoice);

    InvoiceItemResponse toInvoiceItemResponse(InvoiceItem item);

    List<InvoiceItemResponse> toInvoiceItemResponses(List<InvoiceItem> items);

    @Mapping(target = "invoiceId", source = "invoice.id")
    @Mapping(target = "invoiceCode", source = "invoice.invoiceCode")
    PaymentResponse toPaymentResponse(Payment payment);

    List<PaymentResponse> toPaymentResponses(List<Payment> payments);
}
