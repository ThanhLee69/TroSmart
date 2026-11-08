// Dùng chung cho trang danh sách và chi tiết hóa đơn của khách thuê

export const INVOICE_STATUS = {
  UNPAID: { label: "Chưa đóng", bg: "#fff3e0", c: "#b25e00" },
  PARTIALLY_PAID: { label: "Đóng một phần", bg: "#eaf0ff", c: "#3b55d9" },
  OVERDUE: { label: "Quá hạn", bg: "#fdecec", c: "#c0392b" },
  PAID: { label: "Đã đóng", bg: "#e8f7ee", c: "#1c7a45" },
  CANCELLED: { label: "Đã hủy", bg: "#f1f2f7", c: "#5b6385" },
};

// Hóa đơn khách còn phải đóng
export const OPEN_STATUSES = ["UNPAID", "PARTIALLY_PAID", "OVERDUE"];

export const PAYMENT_METHOD_LABEL = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  VNPAY: "VNPay",
};

const FALLBACK = { bg: "#f1f2f7", c: "#5b6385" };

// Quá hạn thì hiện trạng thái "Quá hạn" dù backend còn để UNPAID
export const statusKeyOf = (invoice) =>
  invoice.overdue ? "OVERDUE" : invoice.status;

export const statusMetaOf = (key) =>
  INVOICE_STATUS[key] ?? { ...FALLBACK, label: key ?? "—" };

export const isOpen = (invoice) => OPEN_STATUSES.includes(invoice.status);