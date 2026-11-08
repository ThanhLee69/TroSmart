/**
 * Lựa chọn lọc dùng chung cho ô tìm ở trang chủ và trang Tìm phòng,
 * để hai nơi luôn khớp nhau (trang chủ gửi gì thì trang tìm phòng hiểu đúng như vậy).
 * Đặt tại: src/constants/roomSearchOptions.js
 */

export const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 15].map((km) => ({
  value: km,
  label: `Trong ${String(km).replace(".", ",")} km`,
}));

export const DEFAULT_RADIUS_KM = 2;

/* min: từ (bao gồm), max: đến (không bao gồm). Đơn vị: m² */
export const AREA_OPTIONS = [
  { value: "all", label: "Mọi diện tích" },
  { value: "lt20", label: "Dưới 20 m²", max: 20 },
  { value: "20-28", label: "20 - 28 m²", min: 20, max: 28 },
  { value: "28-35", label: "28 - 35 m²", min: 28, max: 35 },
  { value: "gte35", label: "Từ 35 m²", min: 35 },
];

/* Đơn vị: triệu đồng / tháng */
export const PRICE_PRESETS = [
  { label: "Mọi mức giá", min: null, max: null },
  { label: "Dưới 2,5 triệu", min: null, max: 2.5 },
  { label: "2,5 - 3,5 triệu", min: 2.5, max: 3.5 },
  { label: "Trên 3,5 triệu", min: 3.5, max: null },
];