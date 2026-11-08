package com.project.trosmart.service;

import com.project.trosmart.dto.request.MeterReadingRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.MeterReadingStatus;


public interface MeterReadingService {

    // Lấy danh sách bản ghi điện nước theo phòng, có lọc theo tòa nhà, kỳ ghi và trạng thái
    PageResponse<MeterReadingResponse> getMeterReadings(
            Long buildingId,
            Integer billingMonth,
            Integer billingYear,
            MeterReadingStatus status,
            String keyword,
            int page,
            int size
    );
    // Lấy chi tiết bản ghi điện nước
    MeterReadingDetailResponse getMeterReadingById(Long id);

    // Lấy lịch sử ghi chỉ số điện nước của một phòng, có lọc tháng, năm và phân trang
    PageResponse<MeterReadingHistoryResponse> getMeterReadingHistory(
            Long roomId,
            Integer billingMonth,
            Integer billingYear,
            int page,
            int size
    );

    // Lưu chỉ số điện nước
    MeterReadingResponse createMeterReading(MeterReadingRequest request);

    // Cập nhật chỉ số điện nước khi chưa lập hóa đơn
    MeterReadingResponse updateMeterReading(
            Long id,
            MeterReadingRequest request
    );

    // Lấy thống kê điện nước theo tòa nhà và kỳ ghi
    MeterReadingDashboardResponse getMeterReadingDashboard(
            Long buildingId,
            Integer billingMonth,
            Integer billingYear
    );
}