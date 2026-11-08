// Nhãn, màu và quy tắc thao tác dùng chung cho các trang thông báo

export const NOTIFICATION_TYPE_OPTIONS = [
  { value: "ANNOUNCEMENT", label: "Thông báo chung" },
  { value: "MAINTENANCE", label: "Bảo trì, sửa chữa" },
];

// Loại do hệ thống tạo (admin chỉ xem, không soạn)
export const NOTIFICATION_TYPE_LABELS = {
  ANNOUNCEMENT: "Thông báo chung",
  MAINTENANCE: "Bảo trì, sửa chữa",
  INVOICE_CREATED: "Đã lập hóa đơn",
  PAYMENT_REMINDER: "Nhắc thanh toán",
  CONTRACT_EXPIRING: "Hợp đồng sắp hết hạn",
  SYSTEM: "Hệ thống",
};

export const NOTIFICATION_TYPE_COLORS = {
  ANNOUNCEMENT: "blue",
  MAINTENANCE: "orange",
  INVOICE_CREATED: "geekblue",
  PAYMENT_REMINDER: "red",
  CONTRACT_EXPIRING: "purple",
  SYSTEM: "default",
};

// Dùng cho bộ lọc: gồm cả loại hệ thống
export const NOTIFICATION_TYPE_FILTER_OPTIONS = Object.entries(
  NOTIFICATION_TYPE_LABELS,
).map(([value, label]) => ({ value, label }));

export const NOTIFICATION_PRIORITY_OPTIONS = [
  { value: "LOW", label: "Thấp" },
  { value: "NORMAL", label: "Bình thường" },
  { value: "HIGH", label: "Quan trọng" },
];

export const NOTIFICATION_PRIORITY_COLORS = {
  LOW: "default",
  NORMAL: "blue",
  HIGH: "red",
};

export const NOTIFICATION_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "SCHEDULED", label: "Đã hẹn giờ" },
  { value: "SENT", label: "Đã gửi" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export const NOTIFICATION_STATUS_COLORS = {
  DRAFT: "default",
  SCHEDULED: "gold",
  SENT: "success",
  CANCELLED: "error",
};

export const NOTIFICATION_TARGET_OPTIONS = [
  { value: "ALL", label: "Tất cả khách đang thuê" },
  { value: "BUILDING", label: "Theo tòa nhà" },
  { value: "ROOM", label: "Theo phòng" },
  { value: "TENANT", label: "Một khách thuê" },
];

// Quy tắc thao tác theo trạng thái (khớp với BE)
export const canEditNotification = (status) =>
  status === "DRAFT" || status === "SCHEDULED";

export const canSendNotification = (status) =>
  status === "DRAFT" || status === "SCHEDULED";

export const canCancelNotification = (status) => status === "SCHEDULED";

export const canDeleteNotification = (status) =>
  status === "DRAFT" || status === "CANCELLED";

// Gửi lên BE theo giờ Việt Nam, không kèm múi giờ
export const API_DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm:ss";
export const DISPLAY_DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
