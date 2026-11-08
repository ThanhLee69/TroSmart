package com.project.trosmart.controller;

import com.project.trosmart.dto.request.MeterReadingRequest;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.MeterReadingDashboardResponse;
import com.project.trosmart.dto.response.MeterReadingDetailResponse;
import com.project.trosmart.dto.response.MeterReadingHistoryResponse;
import com.project.trosmart.dto.response.MeterReadingResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.MeterReadingStatus;
import com.project.trosmart.service.MeterReadingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Quản lý chỉ số điện nước. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/meter-readings")
@RequiredArgsConstructor
@Slf4j(topic = "METER-READING-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý điện nước",
        description = "API ghi và xem chỉ số điện nước theo kỳ của từng phòng, chỉ dành cho quản trị viên (ADMIN)"
)
public class MeterReadingController {

    private final MeterReadingService meterReadingService;

    @GetMapping
    @Operation(
            summary = "Xem danh sách chỉ số điện nước",
            description = "Lấy danh sách phòng kèm chỉ số điện nước của một kỳ, "
                    + "lọc theo tòa nhà và trạng thái. Phòng chưa ghi hiển thị trạng thái NOT_RECORDED"
    )
    public ApiResponse<PageResponse<MeterReadingResponse>> getMeterReadings(
            @Parameter(description = "Lọc theo ID tòa nhà. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) Long buildingId,

            @Parameter(description = "Tháng của kỳ ghi, từ 1 đến 12", example = "11", required = true)
            @RequestParam
            @Min(value = 1, message = "Tháng phải từ 1 đến 12")
            @Max(value = 12, message = "Tháng phải từ 1 đến 12")
            Integer billingMonth,

            @Parameter(description = "Năm của kỳ ghi", example = "2026", required = true)
            @RequestParam
            @Min(value = 2000, message = "Năm không hợp lệ")
            @Max(value = 2100, message = "Năm không hợp lệ")
            Integer billingYear,

            @Parameter(description = "Lọc theo trạng thái ghi chỉ số. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) MeterReadingStatus status,

            @Parameter(description = "Từ khóa tìm kiếm (mã phòng...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

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

        PageResponse<MeterReadingResponse> meterReadings =
                meterReadingService.getMeterReadings(
                        buildingId,
                        billingMonth,
                        billingYear,
                        status,
                        keyword,
                        page,
                        size
                );

        return ApiResponse.<PageResponse<MeterReadingResponse>>builder()
                .code(200)
                .message("Get meter readings successfully")
                .result(meterReadings)
                .build();
    }

    @GetMapping("/dashboard")
    @Operation(
            summary = "Xem thống kê điện nước",
            description = "Trả về tổng điện, nước tiêu thụ và số phòng đã/chưa ghi chỉ số "
                    + "theo tòa nhà và kỳ ghi"
    )
    public ApiResponse<MeterReadingDashboardResponse> getMeterReadingDashboard(
            @Parameter(description = "Lọc theo ID tòa nhà. Bỏ trống để thống kê toàn bộ")
            @RequestParam(required = false) Long buildingId,

            @Parameter(description = "Tháng của kỳ ghi, từ 1 đến 12", example = "11", required = true)
            @RequestParam
            @Min(value = 1, message = "Tháng phải từ 1 đến 12")
            @Max(value = 12, message = "Tháng phải từ 1 đến 12")
            Integer billingMonth,

            @Parameter(description = "Năm của kỳ ghi", example = "2026", required = true)
            @RequestParam
            @Min(value = 2000, message = "Năm không hợp lệ")
            @Max(value = 2100, message = "Năm không hợp lệ")
            Integer billingYear
    ) {

        MeterReadingDashboardResponse dashboard =
                meterReadingService.getMeterReadingDashboard(
                        buildingId,
                        billingMonth,
                        billingYear
                );

        return ApiResponse.<MeterReadingDashboardResponse>builder()
                .code(200)
                .message("Get meter reading dashboard successfully")
                .result(dashboard)
                .build();
    }

    @GetMapping("/rooms/{roomId}/history")
    @Operation(
            summary = "Xem lịch sử ghi chỉ số của phòng",
            description = "Lấy lịch sử ghi chỉ số điện nước của một phòng, "
                    + "có thể lọc theo tháng, năm và có phân trang"
    )
    public ApiResponse<PageResponse<MeterReadingHistoryResponse>> getMeterReadingHistory(
            @Parameter(description = "ID phòng", example = "1")
            @PathVariable Long roomId,

            @Parameter(description = "Lọc theo tháng, từ 1 đến 12. Bỏ trống để lấy tất cả", example = "11")
            @RequestParam(required = false)
            @Min(value = 1, message = "Tháng phải từ 1 đến 12")
            @Max(value = 12, message = "Tháng phải từ 1 đến 12")
            Integer billingMonth,

            @Parameter(description = "Lọc theo năm. Bỏ trống để lấy tất cả", example = "2026")
            @RequestParam(required = false)
            @Min(value = 2000, message = "Năm không hợp lệ")
            @Max(value = 2100, message = "Năm không hợp lệ")
            Integer billingYear,

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

        PageResponse<MeterReadingHistoryResponse> history =
                meterReadingService.getMeterReadingHistory(
                        roomId,
                        billingMonth,
                        billingYear,
                        page,
                        size
                );

        return ApiResponse.<PageResponse<MeterReadingHistoryResponse>>builder()
                .code(200)
                .message("Get meter reading history successfully")
                .result(history)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết bản ghi điện nước",
            description = "Lấy thông tin bản ghi điện nước theo ID"
    )
    public ApiResponse<MeterReadingDetailResponse> getMeterReadingById(
            @Parameter(description = "ID bản ghi điện nước", example = "1")
            @PathVariable Long id
    ) {

        MeterReadingDetailResponse meterReading =
                meterReadingService.getMeterReadingById(id);

        return ApiResponse.<MeterReadingDetailResponse>builder()
                .code(200)
                .message("Get meter reading successfully")
                .result(meterReading)
                .build();
    }

    @PostMapping
    @Operation(
            summary = "Lưu chỉ số điện nước",
            description = "Tạo bản ghi điện nước cho một phòng trong một kỳ. "
                    + "Nếu không gửi chỉ số đầu kỳ, hệ thống lấy chỉ số cuối kỳ trước"
    )
    public ApiResponse<MeterReadingResponse> createMeterReading(
            @Valid @RequestBody MeterReadingRequest request
    ) {

        MeterReadingResponse meterReading =
                meterReadingService.createMeterReading(request);

        return ApiResponse.<MeterReadingResponse>builder()
                .code(201)
                .message("Meter reading created successfully")
                .result(meterReading)
                .build();
    }

    @PutMapping("/{id}")
    @Operation(
            summary = "Cập nhật chỉ số điện nước",
            description = "Cập nhật chỉ số điện nước khi bản ghi chưa lập hóa đơn"
    )
    public ApiResponse<MeterReadingResponse> updateMeterReading(
            @Parameter(description = "ID bản ghi điện nước", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody MeterReadingRequest request
    ) {

        MeterReadingResponse meterReading =
                meterReadingService.updateMeterReading(id, request);

        return ApiResponse.<MeterReadingResponse>builder()
                .code(200)
                .message("Meter reading updated successfully")
                .result(meterReading)
                .build();
    }
}