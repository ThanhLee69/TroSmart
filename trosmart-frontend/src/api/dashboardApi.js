import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// ==================== TỔNG QUAN (ADMIN) ====================
// Cần thêm vào apiConfig: DASHBOARD: "/dashboard"

// Số liệu tổng quan; buildingId bỏ trống là xem tất cả tòa nhà
export const getDashboardSummary = async ({ buildingId } = {}) => {
  const res = await axiosClient.get(`${API_CONFIG.DASHBOARD}/summary`, {
    params: { buildingId: buildingId || undefined },
  });

  return res.data.result;
};

// Doanh thu theo tháng: mode "year" (kèm year) hoặc "last12"
export const getRevenue = async ({ mode = "year", year, buildingId } = {}) => {
  const res = await axiosClient.get(`${API_CONFIG.DASHBOARD}/revenue`, {
    params: {
      mode,
      year: mode === "year" ? year : undefined,
      buildingId: buildingId || undefined,
    },
  });

  return res.data.result;
};