import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// =========================
// DANH SÁCH HÓA ĐƠN
// GET /invoices
// Tìm theo mã hóa đơn hoặc mã phòng (keyword)
// =========================
export const getInvoices = async ({
  buildingId,
  billingMonth,
  billingYear,
  status,
  keyword,
  page,
  size,
} = {}) => {
  const response = await axiosClient.get(API_CONFIG.INVOICE, {
    params: {
      buildingId,
      billingMonth,
      billingYear,
      status,
      keyword,
      page,
      size,
    },
  });

  return response.data.result;
};

// =========================
// THỐNG KÊ HÓA ĐƠN CỦA KỲ
// GET /invoices/dashboard
// Bắt buộc có billingMonth và billingYear
// =========================
export const getInvoiceDashboard = async ({
  buildingId,
  billingMonth,
  billingYear,
} = {}) => {
  const response = await axiosClient.get(
    `${API_CONFIG.INVOICE}/dashboard`,
    {
      params: {
        buildingId,
        billingMonth,
        billingYear,
      },
    }
  );

  return response.data.result;
};

// =========================
// HỢP ĐỒNG CÓ THỂ LẬP HÓA ĐƠN TRONG KỲ
// GET /invoices/available-contracts
// Dùng cho ô chọn hợp đồng ở trang Lập hóa đơn
// =========================
export const getAvailableContracts = async ({
  billingMonth,
  billingYear,
} = {}) => {
  const response = await axiosClient.get(
    `${API_CONFIG.INVOICE}/available-contracts`,
    {
      params: {
        billingMonth,
        billingYear,
      },
    }
  );

  return response.data.result;
};

// =========================
// CHI TIẾT HÓA ĐƠN
// GET /invoices/{id}
// =========================
export const getInvoiceById = async (id) => {
  const response = await axiosClient.get(
    `${API_CONFIG.INVOICE}/${id}`
  );

  return response.data.result;
};

// =========================
// XEM TRƯỚC HÓA ĐƠN
// POST /invoices/preview
// request: { contractId, billingMonth, billingYear }
// Trả về { items, totalAmount }: các dòng tự động (tiền phòng, điện, nước, dịch vụ)
// và tổng của chúng. Không lưu dữ liệu.
// =========================
export const previewInvoice = async (request) => {
  const response = await axiosClient.post(
    `${API_CONFIG.INVOICE}/preview`,
    request
  );

  return response.data.result;
};

// =========================
// LẬP HÓA ĐƠN
// POST /invoices
// request: InvoiceRequest
// {
//   contractId, billingMonth, billingYear, issueDate, dueDate, note,
//   items: [{ itemName, itemType: "SURCHARGE" | "DISCOUNT", quantity, unitPrice }]
// }
// Trả về chi tiết hóa đơn vừa lập
// =========================
export const createInvoice = async (invoice) => {
  const response = await axiosClient.post(
    API_CONFIG.INVOICE,
    invoice
  );

  return response.data.result;
};

// =========================
// HỦY HÓA ĐƠN
// PATCH /invoices/{id}/cancel
// request: InvoiceCancelRequest { reason }
// Chỉ hủy được khi chưa có thanh toán
// =========================
export const cancelInvoice = async (id, request) => {
  const response = await axiosClient.patch(
    `${API_CONFIG.INVOICE}/${id}/cancel`,
    request
  );

  return response.data.result;
};

// Tải hóa đơn PDF. Trả về Blob của file PDF.
// Khi lỗi, server trả JSON nhưng axios giữ dưới dạng Blob (do responseType: "blob"),
// nên đọc lại thành object để nơi gọi dùng được error.response.data.message như bình thường.
export const downloadInvoicePdf = async (invoiceId) => {
  try {
    const response = await axiosClient.get(
      `${API_CONFIG.INVOICE}/${invoiceId}/pdf`,
      { responseType: "blob" },
    );
    return response.data;
  } catch (error) {
    const data = error?.response?.data;

    if (data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await data.text());
      } catch {
        // Không phải JSON thì giữ nguyên
      }
    }

    throw error;
  }
};