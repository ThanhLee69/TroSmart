import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Cần thêm vào apiConfig: NOTIFICATION: "/notifications"

// =========================
// THỐNG KÊ THÔNG BÁO (các thẻ ở trang danh sách)
// =========================
export const getNotificationDashboard = async () => {
  const response = await axiosClient.get(`${API_CONFIG.NOTIFICATION}/dashboard`);

  return response.data.result;
};

// =========================
// DANH SÁCH THÔNG BÁO (admin)
// GET /notifications
// =========================
export const getNotifications = async ({
  type,
  status,
  targetType,
  keyword,
  page,
  size,
} = {}) => {
  const response = await axiosClient.get(API_CONFIG.NOTIFICATION, {
    params: { type, status, targetType, keyword, page, size },
  });

  return response.data.result;
};

// =========================
// CHI TIẾT THÔNG BÁO
// GET /notifications/{id}
// =========================
export const getNotificationById = async (id) => {
  const response = await axiosClient.get(`${API_CONFIG.NOTIFICATION}/${id}`);

  return response.data.result;
};

// =========================
// SOẠN THÔNG BÁO
// =========================
export const createNotification = async (notification) => {
  const response = await axiosClient.post(
    API_CONFIG.NOTIFICATION,
    notification
  );

  return response.data.result;
};

// =========================
// SỬA THÔNG BÁO (chỉ khi nháp / đang hẹn giờ)
// =========================
export const updateNotification = async (id, notification) => {
  const response = await axiosClient.put(
    `${API_CONFIG.NOTIFICATION}/${id}`,
    notification
  );

  return response.data.result;
};

// =========================
// GỬI NGAY
// =========================
export const sendNotification = async (id) => {
  const response = await axiosClient.post(
    `${API_CONFIG.NOTIFICATION}/${id}/send`
  );

  return response.data.result;
};

// =========================
// XÓA THÔNG BÁO (chỉ khi nháp / đang hẹn giờ)
// =========================
export const deleteNotification = async (id) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.NOTIFICATION}/${id}`
  );

  return response.data;
};

// =========================
// DANH SÁCH NGƯỜI NHẬN

// =========================
export const getNotificationRecipients = async (
  id,
  { isRead, page, size } = {}
) => {
  const response = await axiosClient.get(
    `${API_CONFIG.NOTIFICATION}/${id}/recipients`,
    { params: { isRead, page, size } }
  );

  return response.data.result;
};

// =========================
// GỢI Ý ĐỐI TƯỢNG NHẬN (cho ô chọn trong form soạn thông báo)

// =========================
export const getNotificationTargetOptions = async ({
  targetType,
  keyword,
} = {}) => {
  const response = await axiosClient.get(
    `${API_CONFIG.NOTIFICATION}/target-options`,
    { params: { targetType, keyword } }
  );

  return response.data.result;
};