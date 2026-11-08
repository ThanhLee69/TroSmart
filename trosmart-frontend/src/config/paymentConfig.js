// Tài khoản nhận tiền của chủ trọ, dùng để tạo mã QR chuyển khoản (VietQR)

export const BANK = {
  bankCode: "ICB", // mã VietinBank trên VietQR
  bankName: "VietinBank",
  accountNumber: "105872763781",
  accountName: "LE DANG THANH",
};

// Nội dung chuyển khoản: mã hóa đơn, bỏ dấu và ký tự đặc biệt, tối đa 25 ký tự
export const toTransferContent = (invoiceCode = "") =>
  String(invoiceCode)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 25);

// Ảnh QR đã điền sẵn số tài khoản, số tiền và nội dung
export const buildQrUrl = ({ amount, content }) => {
  const params = new URLSearchParams({
    amount: String(Math.round(Number(amount) || 0)),
    addInfo: content,
    accountName: BANK.accountName,
  });

  return `https://img.vietqr.io/image/${BANK.bankCode}-${BANK.accountNumber}-compact2.png?${params.toString()}`;
};