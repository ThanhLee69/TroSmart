package com.project.trosmart.service;

import com.project.trosmart.dto.response.ContractPdfFile;
import com.project.trosmart.dto.request.*;
import com.project.trosmart.dto.response.ContractDashboardResponse;
import com.project.trosmart.dto.response.ContractDetailResponse;

import com.project.trosmart.dto.response.ContractResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.ContractStatus;

import java.time.LocalDate;
import java.util.List;

public interface ContractService {

    // Tạo / sửa hợp đồng: trả bản rút gọn
    ContractResponse createContract(ContractRequest request);

    ContractResponse updateContract(Long contractId, ContractRequest request);

    // Chi tiết đầy đủ
    ContractDetailResponse getContractById(Long contractId);

    PageResponse<ContractResponse> getContracts(
            String keyword,
            ContractStatus status,
            Long buildingId,
            int page,
            int size
    );

    ContractDetailResponse addCoTenant(Long contractId, ContractCoTenantRequest request);

    ContractDetailResponse removeCoTenant(Long contractId, Long tenantId, LocalDate moveOutDate);

    ContractDetailResponse addService(Long contractId, ContractServiceRequest request);

    // contractServiceId = id dòng dịch vụ trong hợp đồng; dịch vụ bắt buộc không được bỏ
    ContractDetailResponse removeService(Long contractId, Long contractServiceId);

    // Chỉ xóa hợp đồng nháp (DRAFT)
    void deleteContract(Long contractId);

    ContractDetailResponse terminateContract(Long contractId, ContractTerminationRequest request);

    ContractDetailResponse extendContract(Long contractId, ContractExtensionRequest request);

    // Xuất hợp đồng ra PDF khổ A4 theo mẫu, mọi trạng thái đều xuất được
    // (nháp có dòng "BẢN NHÁP", đã chấm dứt có dòng "ĐÃ CHẤM DỨT")
    ContractPdfFile exportContractPdf(Long contractId);

    List<ContractResponse> getContractOptions(String keyword);

    ContractDashboardResponse getContractDashboard();
}