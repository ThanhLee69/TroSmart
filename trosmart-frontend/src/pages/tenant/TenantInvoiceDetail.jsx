import { useEffect, useRef, useState } from "react";
import { Button } from "antd";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeftOutlined,
  CopyOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { createVnpayPayment, getMyInvoiceDetail } from "../../api/myTenantApi";
import { tenant_path_name } from "../../constants/path_name";
import { useNotify } from "../../components/NotificationProvider";
import { AsyncBlock, formatDate, formatMoney, useLoad } from "./tenantUi";
import {
  PAYMENT_METHOD_LABEL,
  isOpen,
  statusKeyOf,
  statusMetaOf,
} from "./invoiceMeta";
import {
  BANK,
  buildQrUrl,
  toTransferContent,
} from "../../config/paymentConfig";

// "2 × 3,500" khi có số lượng
const quantityText = (item) =>
  item.quantity != null && item.unitPrice != null
    ? `${Number(item.quantity).toLocaleString("vi-VN")} × ${formatMoney(item.unitPrice)}`
    : null;

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return `${formatDate(value)} ${date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

// Dòng thông tin chuyển khoản, có nút sao chép
function PayRow({ label, value, copyValue, onCopy, strong }) {
  return (
    <div className="tv-qr__row">
      <span>{label}</span>
      <div>
        <b className={strong ? "is-strong" : ""}>{value}</b>
        {copyValue != null && (
          <button
            type="button"
            className="tv-qr__copy"
            aria-label={`Sao chép ${label.toLowerCase()}`}
            onClick={() => onCopy(copyValue, label)}
          >
            <CopyOutlined />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TenantInvoiceDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { notify, contextHolder } = useNotify();
  const [qrFailed, setQrFailed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const invoice = useLoad(() => getMyInvoiceDetail(id), [id]);
  const v = invoice.data;

  // VNPay đưa người dùng quay về kèm ?payment=success|failed|invalid
  const paymentResult = searchParams.get("payment");

  // Nhớ kết quả đã báo: React StrictMode (chạy dev) chạy effect 2 lần khi mở trang
  // nên không có chốt này thì thông báo hiện hai lần.
  const handledResult = useRef(null);

  useEffect(() => {
    if (!paymentResult) {
      handledResult.current = null;
      return;
    }

    if (handledResult.current === paymentResult) return;
    handledResult.current = paymentResult;

    if (paymentResult === "success") {
      notify({
        type: "success",
        message: "Thanh toán thành công",
        description: "Hóa đơn đã được cập nhật.",
      });
      invoice.reload();
    } else {
      notify({
        type: "error",
        message:
          paymentResult === "invalid"
            ? "Không xác thực được kết quả thanh toán"
            : "Thanh toán chưa hoàn tất",
        description: "Chưa có khoản tiền nào bị ghi nhận. Bạn có thể thử lại.",
      });
    }

    // Xóa tham số khỏi địa chỉ để tải lại trang không báo lần nữa
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentResult]);

  // Lấy link thanh toán từ backend rồi chuyển sang cổng VNPay
  const payWithVnpay = async () => {
    setPaying(true);

    try {
      const url = await createVnpayPayment(id);
      window.location.href = url;
    } catch (error) {
      setPaying(false);
      notify({
        type: "error",
        message: "Không tạo được thanh toán",
        description: error?.response?.data?.message ?? "Vui lòng thử lại sau.",
      });
    }
  };

  const backToList = () => navigate(tenant_path_name.invoice);

  const meta = v ? statusMetaOf(statusKeyOf(v)) : null;
  const remaining = Number(v?.remainingAmount ?? 0);
  const items = v?.items ?? [];
  const payments = v?.payments ?? [];

  // Còn nợ thì hiện mã QR chuyển khoản đúng số tiền còn lại
  const showQr = v && isOpen(v) && remaining > 0;
  const transferContent = v ? toTransferContent(v.invoiceCode) : "";
  const qrUrl = showQr
    ? buildQrUrl({ amount: remaining, content: transferContent })
    : "";

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(String(text));
    } catch {
      // Trình duyệt không cho dùng clipboard: sao chép bằng ô nhập tạm
      const area = document.createElement("textarea");
      area.value = String(text);
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }

    notify({
      type: "success",
      message: "Đã sao chép",
      description: label,
    });
  };

  return (
    <div className="tn-page tv-page">
      {contextHolder}

      <div className="tv-back">
        <Button
          className="tv-back__btn"
          icon={<ArrowLeftOutlined />}
          onClick={backToList}
          aria-label="Quay lại"
        />
        <h1>Chi tiết hóa đơn</h1>
      </div>

      <AsyncBlock
        loading={invoice.loading}
        error={invoice.error}
        onRetry={invoice.reload}
        isEmpty={!v}
        emptyText="Không tìm thấy hóa đơn"
      >
        {v && (
          <>
            {/* Thẻ đầu trang */}
            <div className="tv-hero">
              <div className="tv-hero__top">
                <small>
                  Hóa đơn tháng {v.billingMonth}/{v.billingYear}
                </small>
                <span
                  className="tv-hero__chip"
                  style={{ "--bg": meta.bg, "--c": meta.c }}
                >
                  {meta.label}
                </span>
              </div>

              <div className="tv-hero__amount">
                {formatMoney(remaining > 0 ? remaining : v.totalAmount)}
              </div>
              <p>
                {remaining > 0
                  ? `Còn phải đóng · hạn ${formatDate(v.dueDate)}`
                  : "Đã thanh toán đủ"}
              </p>
              <span className="tv-hero__code">Mã: {v.invoiceCode}</span>
            </div>

            {/* QR chuyển khoản */}
            {showQr && (
              <section className="tv-card tv-qr">
                <h2>Thanh toán chuyển khoản</h2>

                <div className="tv-qr__body">
                  <div className="tv-qr__img">
                    {qrFailed ? (
                      <div className="tv-qr__fail">
                        Không tải được mã QR. Vui lòng chuyển khoản theo thông
                        tin bên cạnh.
                      </div>
                    ) : (
                      <img
                        src={qrUrl}
                        alt="Mã QR chuyển khoản"
                        onError={() => setQrFailed(true)}
                      />
                    )}
                  </div>

                  <div className="tv-qr__info">
                    <PayRow label="Ngân hàng" value={BANK.bankName} />
                    <PayRow
                      label="Chủ tài khoản"
                      value={BANK.accountName}
                      copyValue={BANK.accountName}
                      onCopy={copy}
                    />
                    <PayRow
                      label="Số tài khoản"
                      value={BANK.accountNumber}
                      copyValue={BANK.accountNumber}
                      onCopy={copy}
                      strong
                    />
                    <PayRow
                      label="Số tiền"
                      value={formatMoney(remaining)}
                      copyValue={Math.round(remaining)}
                      onCopy={copy}
                      strong
                    />
                    <PayRow
                      label="Nội dung"
                      value={transferContent}
                      copyValue={transferContent}
                      onCopy={copy}
                      strong
                    />
                  </div>
                </div>

                <p className="tv-hint">
                  Quét mã bằng ứng dụng ngân hàng và giữ nguyên nội dung chuyển
                  khoản để chủ trọ đối chiếu. Sau khi chuyển, chủ trọ xác nhận
                  và hóa đơn sẽ được cập nhật.
                </p>
              </section>
            )}

            <div className="tv-layout">
              <div className="tv-col">
                {/* Các khoản thu */}
                <section className="tv-card">
                  <h2>Các khoản thu</h2>

                  <div className="tv-lines">
                    {items.map((item) => (
                      <div className="tv-line" key={item.id}>
                        <div>
                          <b>{item.itemName}</b>
                          {quantityText(item) && (
                            <small>{quantityText(item)}</small>
                          )}
                        </div>
                        <span>{formatMoney(item.amount)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="tv-total">
                    <span>Tổng cộng</span>
                    <b>{formatMoney(v.totalAmount)}</b>
                  </div>
                </section>

                {v.note && (
                  <section className="tv-card">
                    <h2>Ghi chú</h2>
                    <p className="tv-note">{v.note}</p>
                  </section>
                )}
              </div>

              <div className="tv-col">
                {/* Thanh toán */}
                <section className="tv-card">
                  <h2>Thanh toán</h2>

                  <div className="tv-row">
                    <span>Ngày lập</span>
                    <b>{formatDate(v.issueDate)}</b>
                  </div>
                  <div className="tv-row">
                    <span>Hạn đóng</span>
                    <b>{formatDate(v.dueDate)}</b>
                  </div>
                  <div className="tv-row">
                    <span>Đã đóng</span>
                    <b>{formatMoney(v.paidAmount)}</b>
                  </div>
                  <div className="tv-row">
                    <span>Còn lại</span>
                    <b className={remaining > 0 ? "is-due" : "is-ok"}>
                      {formatMoney(remaining)}
                    </b>
                  </div>

                  {showQr && (
                    <Button
                      type="primary"
                      block
                      size="large"
                      icon={<CreditCardOutlined />}
                      loading={paying}
                      onClick={payWithVnpay}
                      style={{ marginTop: 14 }}
                    >
                      Thanh toán qua VNPay
                    </Button>
                  )}

                  {isOpen(v) && (
                    <p className="tv-hint">
                      Vui lòng thanh toán trước hạn. Cần hỗ trợ thì liên hệ chủ
                      trọ.
                    </p>
                  )}
                </section>

                {/* Lịch sử thanh toán */}
                <section className="tv-card">
                  <h2>Lịch sử thanh toán</h2>

                  {payments.length === 0 ? (
                    <div className="tv-empty tv-empty--flat">
                      Chưa có khoản thanh toán nào.
                    </div>
                  ) : (
                    <div className="tv-pays">
                      {payments.map((p) => (
                        <div className="tv-pay" key={p.id}>
                          <div>
                            <b>{formatMoney(p.amount)}</b>
                            <small>
                              {PAYMENT_METHOD_LABEL[p.paymentMethod] ??
                                p.paymentMethod ??
                                "—"}
                              {p.transactionCode && ` · ${p.transactionCode}`}
                            </small>
                          </div>
                          <span>{formatDateTime(p.paymentDate)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </AsyncBlock>
    </div>
  );
}
