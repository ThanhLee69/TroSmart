
import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Tìm kiếm, lọc và phân trang yêu cầu sửa chữa (chủ trọ)
export const getIssues = async ({
  keyword,
  status,
  category,
  priority,
  page = 1,
  size = 10,
} = {}) => {
  const response = await axiosClient.get(API_CONFIG.ISSUE, {
    params: {
      keyword: keyword?.trim() || undefined,
      status: status || undefined,
      category: category || undefined,
      priority: priority || undefined,
      page,
      size,
    },
  });

  return response.data.result;
};

// Lấy chi tiết yêu cầu sửa chữa (chủ trọ)
export const getIssueById = async (id) => {
  const response = await axiosClient.get(
    `${API_CONFIG.ISSUE}/${id}`
  );

  return response.data.result;
};

// Cập nhật trạng thái yêu cầu sửa chữa (chủ trọ)
export const updateIssueStatus = async (id, status) => {
  const response = await axiosClient.patch(
    `${API_CONFIG.ISSUE}/${id}/status`,
    { status }
  );

  return response.data.result;
};
// Hủy yêu cầu sửa chữa (chủ trọ)
export const cancelIssue = async (id) => {
  const response = await axiosClient.patch(
    `${API_CONFIG.ISSUE}/${id}/cancel`
  );

  return response.data.result;
};

// Lấy thống kê yêu cầu sửa chữa (chủ trọ)
export const getIssueDashboard = async () => {
  const response = await axiosClient.get(
    `${API_CONFIG.ISSUE}/dashboard`
  );

  return response.data.result;
};
