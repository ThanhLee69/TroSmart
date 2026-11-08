/**
 * Hiển thị tiền dạng VNĐ (có hoặc không có ₫)
 */
export const formatCurrency = (amount, withSymbol = false) => {
  if (amount === null || amount === undefined || amount === "") return "";

  const formatted = Number(amount).toLocaleString("en-US");

  return withSymbol ? `${formatted} ₫` : formatted;
};