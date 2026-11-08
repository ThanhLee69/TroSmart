import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";


const ME = API_CONFIG.TENANT_ME;

// ---------- Tổng quan, hợp đồng, xe ----------
export const getMyDashboard = async () =>
  (await axiosClient.get(`${ME}/dashboard`)).data.result;

export const getMyContract = async () =>
  (await axiosClient.get(`${ME}/contract`)).data.result;

export const getMyVehicles = async () =>
  (await axiosClient.get(`${ME}/vehicles`)).data.result;

// ---------- Hóa đơn ----------
export const getMyInvoices = async ({ page = 1, size = 20, statuses } = {}) =>
  (
    await axiosClient.get(`${ME}/invoices`, {
      params: {
        page,
        size,
        statuses: statuses?.length ? statuses.join(",") : undefined,
      },
    })
  ).data.result;

  export const getMyInvoiceSummary = async () =>
  (await axiosClient.get(`${ME}/invoices/summary`)).data.result;

export const getMyInvoiceDetail = async (id) =>
  (await axiosClient.get(`${ME}/invoices/${id}`)).data.result;

// ---------- Yêu cầu sửa chữa ----------
 export const getMyIssues = async ({ page = 1, size = 50 } = {}) =>
  (await axiosClient.get(`${ME}/issues`, { params: { page, size } })).data
    .result;

export const createMyIssue = async (payload) =>
  (await axiosClient.post(`${ME}/my-issues`, payload)).data.result;

export const cancelMyIssue = async (id) =>
  (await axiosClient.patch(`${ME}/issues/${id}/cancel`)).data.result;

// ---------- Thông báo ----------
export const getMyNotifications = async ({
  page = 1,
  size = 20,
  unreadOnly = false,
  types,
} = {}) =>
  (
    await axiosClient.get(`${ME}/notifications`, {
      params: {
        page,
        size,
        unreadOnly,
        types: types?.length ? types.join(",") : undefined,
      },
    })
  ).data.result;

export const getMyUnreadNotificationCount = async () =>
  (await axiosClient.get(`${ME}/notifications/unread-count`)).data.result;

export const markMyNotificationRead = async (id) =>
  (await axiosClient.patch(`${ME}/notifications/${id}/read`)).data.result;

export const markAllMyNotificationsRead = async () =>
  (await axiosClient.patch(`${ME}/notifications/read-all`)).data.result;

    // ---------- Tài khoản ----------
export const getMyProfile = async () =>
  (await axiosClient.get(`${ME}/profile`)).data.result;

export const changeMyPassword = async (payload) =>
  (await axiosClient.put(`${ME}/password`, payload)).data.result;