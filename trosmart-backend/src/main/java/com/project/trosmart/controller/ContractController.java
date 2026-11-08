package com.project.trosmart.controller;

import com.project.trosmart.dto.response.ContractPdfFile;
import com.project.trosmart.dto.request.*;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.ContractDashboardResponse;
import com.project.trosmart.dto.response.ContractDetailResponse;
import com.project.trosmart.dto.response.ContractResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.service.ContractService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

/**
 * Quản lý hợp đồng thuê phòng. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
@Slf4j(topic = "CONTRACT-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý hợp đồng",
        description = "API quản lý hợp đồng thuê phòng, chỉ dành cho quản trị viên (ADMIN)"
)
public class ContractController {

    private final ContractService contractService;

    // ---------- Danh sách, thống kê, tra cứu ----------

    @GetMapping
    @Operation(
            summary = "Xem danh sách hợp đồng",
            description = "Tìm kiếm, lọc theo trạng thái, tòa nhà và phân trang danh sách hợp đồng"
    )
    public ApiResponse<PageResponse<ContractResponse>> getContracts(
            @Parameter(description = "Từ khóa tìm kiếm (mã hợp đồng, phòng, khách...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo trạng thái hợp đồng. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) ContractStatus status,

            @Parameter(description = "Lọc theo ID tòa nhà. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) Long buildingId,

            @Parameter(description = "Số trang, bắt đầu từ 1", example = "1")
            @RequestParam(defaultValue = "1")
            @Min(value = 1, message = "Trang phải lớn hơn hoặc bằng 1")
            int page,

            @Parameter(description = "Số bản ghi mỗi trang, từ 1 đến 100", example = "10")
            @RequestParam(defaultValue = "10")
            @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
            @Max(value = 100, message = "Kích thước trang tối đa là 100")
            int size
    ) {
        PageResponse<ContractResponse> response =
                contractService.getContracts(
                        keyword,
                        status,
                        buildingId,
                        page,
                        size
                );

        return ApiResponse.<PageResponse<ContractResponse>>builder()
                .code(200)
                .message("Get contracts successfully")
                .result(response)
                .build();
    }

    @GetMapping("/dashboard")
    @Operation(
            summary = "Xem thống kê hợp đồng",
            description = "Trả về tổng số hợp đồng, hợp đồng đang hiệu lực, hợp đồng nháp "
                    + "và hợp đồng sắp hết hạn trong 30 ngày tới"
    )
    public ApiResponse<ContractDashboardResponse> getContractDashboard() {

        log.info("Getting contract dashboard");

        ContractDashboardResponse dashboard =
                contractService.getContractDashboard();

        return ApiResponse.<ContractDashboardResponse>builder()
                .code(200)
                .message("Get contract dashboard successfully")
                .result(dashboard)
                .build();
    }

    @GetMapping("/options")
    @Operation(
            summary = "Xem danh sách hợp đồng để chọn",
            description = "Trả về danh sách hợp đồng đang hiệu lực (ACTIVE) dùng cho các ô chọn"
    )
    public ApiResponse<List<ContractResponse>> getContractOptions(
            @Parameter(description = "Từ khóa tìm kiếm. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword
    ) {
        List<ContractResponse> response =
                contractService.getContractOptions(keyword);

        return ApiResponse.<List<ContractResponse>>builder()
                .code(200)
                .message("Get contract options successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết hợp đồng",
            description = "Lấy thông tin hợp đồng theo ID, kèm người ở cùng và dịch vụ áp dụng"
    )
    public ApiResponse<ContractDetailResponse> getContractById(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable("id") Long contractId
    ) {
        ContractDetailResponse response =
                contractService.getContractById(contractId);

        return ApiResponse.<ContractDetailResponse>builder()
                .code(200)
                .message("Get contract successfully")
                .result(response)
                .build();
    }

    // Không đặt produces = PDF ở đây: khi lỗi, handler trả JSON, nếu mapping chỉ cho phép PDF
    // thì Spring không ghi được thân lỗi (HttpMediaTypeNotAcceptableException)
    @GetMapping("/{id}/pdf")
    @Operation(
            summary = "Xuất hợp đồng PDF",
            description = "Điền thông tin hợp đồng vào mẫu và trả về tệp PDF khổ A4 để in hoặc ký. "
                    + "Hợp đồng nháp có dòng BẢN NHÁP, hợp đồng đã chấm dứt có dòng ĐÃ CHẤM DỨT"
    )
    public ResponseEntity<byte[]> exportContractPdf(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable("id") Long contractId
    ) {
        ContractPdfFile file = contractService.exportContractPdf(contractId);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment()
                                .filename(file.fileName(), StandardCharsets.UTF_8)
                                .build()
                                .toString())
                .contentLength(file.content().length)
                .body(file.content());
    }

    // ---------- Tạo, sửa, xóa (hợp đồng nháp) ----------

    @PostMapping
    @Operation(
            summary = "Tạo hợp đồng",
            description = "Tạo mới hợp đồng thuê phòng ở trạng thái nháp (DRAFT)"
    )
    public ApiResponse<ContractResponse> createContract(
            @Valid @RequestBody ContractRequest request
    ) {
        ContractResponse response =
                contractService.createContract(request);

        return ApiResponse.<ContractResponse>builder()
                .code(201)
                .message("Contract created successfully")
                .result(response)
                .build();
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Cập nhật hợp đồng",
            description = "Chỉ cập nhật được hợp đồng ở trạng thái nháp (DRAFT)"
    )
    public ApiResponse<ContractResponse> updateContract(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable("id") Long contractId,
            @Valid @RequestBody ContractRequest request
    ) {
        ContractResponse response =
                contractService.updateContract(contractId, request);

        return ApiResponse.<ContractResponse>builder()
                .code(200)
                .message("Contract updated successfully")
                .result(response)
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Xóa hợp đồng",
            description = "Xóa mềm hợp đồng, chỉ áp dụng cho hợp đồng ở trạng thái nháp (DRAFT)"
    )
    public ApiResponse<Void> deleteContract(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable("id") Long contractId
    ) {
        contractService.deleteContract(contractId);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Contract deleted successfully")
                .build();
    }

    // ---------- Thao tác với hợp đồng đang hiệu lực ----------

    @PatchMapping("/{id}/extend")
    @Operation(
            summary = "Gia hạn hợp đồng",
            description = "Gia hạn ngày kết thúc của hợp đồng đang hiệu lực (ACTIVE)"
    )
    public ApiResponse<ContractDetailResponse> extendContract(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable("id") Long contractId,
            @Valid @RequestBody ContractExtensionRequest request
    ) {
        ContractDetailResponse response =
                contractService.extendContract(contractId, request);

        return ApiResponse.<ContractDetailResponse>builder()
                .code(200)
                .message("Contract extended successfully")
                .result(response)
                .build();
    }

    @PatchMapping("/{id}/terminate")
    @Operation(
            summary = "Chấm dứt hợp đồng",
            description = "Chấm dứt hợp đồng đang hiệu lực (ACTIVE) và ghi nhận lý do"
    )
    public ApiResponse<ContractDetailResponse> terminateContract(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable("id") Long contractId,
            @Valid @RequestBody ContractTerminationRequest request
    ) {
        ContractDetailResponse response =
                contractService.terminateContract(contractId, request);

        return ApiResponse.<ContractDetailResponse>builder()
                .code(200)
                .message("Contract terminated successfully")
                .result(response)
                .build();
    }

    @PostMapping("/{id}/co-tenants")
    @Operation(
            summary = "Thêm người ở cùng",
            description = "Thêm một khách thuê vào hợp đồng. Chỉ áp dụng cho hợp đồng đang hiệu lực (ACTIVE)"
    )
    public ApiResponse<ContractDetailResponse> addCoTenant(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody ContractCoTenantRequest request
    ) {
        ContractDetailResponse response = contractService.addCoTenant(id, request);

        return ApiResponse.<ContractDetailResponse>builder()
                .code(200)
                .message("Add co-tenant successfully")
                .result(response)
                .build();
    }

    @DeleteMapping("/{id}/co-tenants/{tenantId}")
    @Operation(
            summary = "Bớt người ở cùng",
            description = "Ghi ngày chuyển đi của khách, không xóa lịch sử. "
                    + "Không bớt được người đứng tên chính"
    )
    public ApiResponse<ContractDetailResponse> removeCoTenant(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable Long id,

            @Parameter(description = "ID khách thuê cần bớt", example = "1")
            @PathVariable Long tenantId,

            @Parameter(description = "Ngày chuyển đi (yyyy-MM-dd). Bỏ trống thì lấy ngày hiện tại",
                    example = "2026-11-07")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate moveOutDate
    ) {
        ContractDetailResponse response =
                contractService.removeCoTenant(id, tenantId, moveOutDate);

        return ApiResponse.<ContractDetailResponse>builder()
                .code(200)
                .message("Remove co-tenant successfully")
                .result(response)
                .build();
    }

    @PostMapping("/{id}/services")
    @Operation(
            summary = "Thêm dịch vụ vào hợp đồng",
            description = "Chỉ áp dụng cho hợp đồng đang hiệu lực (ACTIVE)"
    )
    public ApiResponse<ContractDetailResponse> addService(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody ContractServiceRequest request
    ) {
        ContractDetailResponse response = contractService.addService(id, request);

        return ApiResponse.<ContractDetailResponse>builder()
                .code(200)
                .message("Add contract service successfully")
                .result(response)
                .build();
    }

    @DeleteMapping("/{id}/services/{contractServiceId}")
    @Operation(
            summary = "Bỏ dịch vụ khỏi hợp đồng",
            description = "Chỉ áp dụng cho hợp đồng đang hiệu lực (ACTIVE)"
    )
    public ApiResponse<ContractDetailResponse> removeService(
            @Parameter(description = "ID hợp đồng", example = "1")
            @PathVariable Long id,

            @Parameter(description = "ID dịch vụ trong hợp đồng (không phải ID danh mục dịch vụ)", example = "1")
            @PathVariable Long contractServiceId
    ) {
        ContractDetailResponse response =
                contractService.removeService(id, contractServiceId);

        return ApiResponse.<ContractDetailResponse>builder()
                .code(200)
                .message("Remove contract service successfully")
                .result(response)
                .build();
    }
}