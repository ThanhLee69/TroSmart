import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// =========================
// LỊCH SỬ THANH TOÁN CỦA HÓA ĐƠN
// GET /invoices/{invoiceId}/payments
// =========================
export const getPaymentsByInvoice = async (invoiceId) => {
  const response = await axiosClient.get(
    `${API_CONFIG.INVOICE}/${invoiceId}/payments`
  );

  return response.data.result;
};

// =========================
// GHI NHẬN THANH TOÁN
// POST /invoices/{invoiceId}/payments
// request: PaymentRequest
// { amount, paymentMethod: "CASH" | "BANK_TRANSFER", paymentDate, transactionCode, note }
// Trả về chi tiết hóa đơn đã cập nhật để vẽ lại ngay
// =========================
export const createPayment = async (invoiceId, payment) => {
  const response = await axiosClient.post(
    `${API_CONFIG.INVOICE}/${invoiceId}/payments`,
    payment
  );

  return response.data.result;
};

// =========================
// XÓA THANH TOÁN NHẬP NHẦM
// DELETE /invoices/{invoiceId}/payments/{paymentId}
// Trả về chi tiết hóa đơn đã cập nhật
// =========================
export const deletePayment = async (invoiceId, paymentId) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.INVOICE}/${invoiceId}/payments/${paymentId}`
  );

  return response.data.result;
};