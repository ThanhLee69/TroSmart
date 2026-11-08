package com.project.trosmart.service;

import com.project.trosmart.dto.response.DashboardRevenueResponse;
import com.project.trosmart.dto.response.DashboardSummaryResponse;

public interface DashboardService {

    /**
     * @param buildingId null là xem tất cả tòa nhà
     */
    DashboardSummaryResponse getSummary(Long buildingId);

    /**
     * @param mode       "year" (đủ 12 tháng của một năm) hoặc "last12" (12 tháng gần nhất)
     * @param year       chỉ dùng khi mode là "year", null là năm hiện tại
     * @param buildingId null là xem tất cả tòa nhà
     */
    DashboardRevenueResponse getRevenue(String mode, Integer year, Long buildingId);
}