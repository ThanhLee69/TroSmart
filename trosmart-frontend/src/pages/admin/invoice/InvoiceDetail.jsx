import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckOutlined,
  CloseOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
  PlusCircleOutlined,
  TagOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  ExperimentOutlined,
  SlackOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  cancelInvoice,
  downloadInvoicePdf,
  getInvoiceById,
} from "../../../api/invoiceApi";
import { createPayment, deletePayment } from "../../../api/paymentApi";
import { useNotify } from "../../../components/NotificationProvider";
import { path_name } from "../../../constants/path_name";
import "./InvoiceDetail.css";

const { TextArea } = Input;

const DATE_FORMAT = "DD/MM/YYYY";
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const API_DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm:ss";

// Trạng thái hóa đơn (InvoiceStatus)
const STATUS_META = {
  UNPAID: {
    label: "Chưa thanh toán",
    style: { background: "#eef0fd", color: "#3b4bcb" },
  },
  PARTIALLY_PAID: {
    label: "Trả một phần",
    style: { background: "#fff7e6", color: "#d46b08" },
  },
  PAID: {
    label: "Đã thanh toán",
    style: { background: "#e6f6ee", color: "#137a4b" },
  },
  OVERDUE: {
    label: "Quá hạn",
    style: { background: "#fff1f0", color: "#cf1322" },
  },
  CANCELLED: {
    label: "Đã hủy",
    style: { background: "#f1f3fb", color: "#5b6385" },
  },
};

// Loại dòng (InvoiceItemType)
const ITEM_META = {
  ROOM_FEE: {
    label: "Tiền phòng",
    icon: <HomeOutlined />,
    color: { background: "#eef0fd", color: "#3b4bcb" },
  },
  ELECTRICITY: {
    label: "Điện",
    icon: <ThunderboltOutlined />,
    color: { background: "#fff9e8", color: "#8a5a00" },
  },
  WATER: {
    label: "Nước",
    icon: <ExperimentOutlined />,
    color: { background: "#e8f6fb", color: "#0f5e6c" },
  },
  SERVICE: {
    label: "Dịch vụ",
    icon: <SlackOutlined />,
    color: { background: "#e6f6ee", color: "#137a4b" },
  },
  SURCHARGE: {
    label: "Phụ phí",
    icon: <PlusCircleOutlined />,
    color: { background: "#fff1f0", color: "#cf1322" },
  },
  DISCOUNT: {
    label: "Giảm giá",
    icon: <TagOutlined />,
    color: { background: "#f9ecff", color: "#8e24aa" },
  },
};

const DEFAULT_ITEM_META = ITEM_META.SERVICE;

// Lý do hủy hóa đơn: chọn 1, "Khác" thì phải nhập tay
const CANCEL_REASONS = [
  { value: "WRONG_METER", label: "Nhập sai chỉ số điện nước" },
  { value: "WRONG_AMOUNT", label: "Sai tiền phòng hoặc dịch vụ" },
  { value: "DUPLICATE", label: "Lập trùng hóa đơn" },
  { value: "CONTRACT_ENDED", label: "Khách trả phòng, hợp đồng kết thúc" },
  { value: "RECREATE", label: "Hủy để lập lại hóa đơn" },
  { value: "OTHER", label: "Lý do khác" },
];

const PAYMENT_METHODS = [
  {
    value: "CASH",
    label: "Tiền mặt",
    hint: "Thu trực tiếp",
    icon: <DollarOutlined />,
    color: { background: "#e6f6ee", color: "#137a4b" },
  },
  {
    value: "BANK_TRANSFER",
    label: "Chuyển khoản",
    hint: "Cần mã giao dịch",
    icon: <BankOutlined />,
    color: { background: "#eef0fd", color: "#4a5be0" },
  },
];

// Chỉ để hiển thị lịch sử: gồm cả VNPay (khách tự thanh toán online).
// Form ghi nhận thanh toán của chủ trọ vẫn chỉ dùng PAYMENT_METHODS ở trên.
const HISTORY_METHODS = [
  ...PAYMENT_METHODS,
  {
    value: "VNPAY",
    label: "VNPay",
    icon: <CreditCardOutlined />,
    color: { background: "#e8f2ff", color: "#005baa" },
  },
];

// Tiền hiển thị kiểu 100,000đ (dấu phẩy ngăn cách hàng nghìn)
const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}đ`;

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

// Ô nhập tiền: hiển thị 100,000 và đọc ngược về số
const moneyFormatter = (value) =>
  `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const moneyParser = (value) => (value || "").replace(/,/g, "");

const formatDate = (value) => (value ? dayjs(value).format(DATE_FORMAT) : "—");

const formatDateTime = (value) =>
  value ? dayjs(value).format(DATE_TIME_FORMAT) : "—";

const InvoiceDetail = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { notify, contextHolder } = useNotify();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal ghi nhận thanh toán
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(null);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payDate, setPayDate] = useState(dayjs());
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payErrors, setPayErrors] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Modal hủy hóa đơn
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelKey, setCancelKey] = useState(null);
  const [cancelOther, setCancelOther] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Tải hóa đơn PDF
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const goToList = useCallback(() => navigate(path_name.invoice), [navigate]);

  // =========================
  // TẢI CHI TIẾT
  // =========================
  const fetchInvoice = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);

      try {
        const data = await getInvoiceById(invoiceId);
        setInvoice(data);
      } catch (error) {
        notifyRef.current({
          type: "error",
          message: "Không thể tải hóa đơn",
          description:
            error?.response?.data?.message || "Vui lòng thử lại sau.",
        });

        if (!silent) setInvoice(null);
      } finally {
        setLoading(false);
      }
    },
    [invoiceId],
  );

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Cập nhật từ kết quả API (trả về chi tiết mới); nếu thiếu thì tải lại
  const applyResult = (result) => {
    if (result?.id) {
      setInvoice(result);
    } else {
      fetchInvoice({ silent: true });
    }
  };

  // =========================
  // GIÁ TRỊ SUY RA
  // =========================
  const status = invoice?.status;
  const isCancelled = status === "CANCELLED";
  const isOverdue = status === "OVERDUE";

  const total = Number(invoice?.totalAmount || 0);
  const paid = Number(invoice?.paidAmount || 0);
  const remaining = isCancelled ? 0 : Number(invoice?.remainingAmount || 0);

  const canPay =
    !!invoice &&
    ["UNPAID", "PARTIALLY_PAID", "OVERDUE"].includes(status) &&
    remaining > 0;
  const canCancel =
    !!invoice &&
    ["UNPAID", "PARTIALLY_PAID", "OVERDUE"].includes(status) &&
    paid === 0;

  const percent = useMemo(() => {
    if (isCancelled || total <= 0) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  }, [isCancelled, paid, total]);

  const items = invoice?.items ?? [];
  const payments = invoice?.payments ?? [];

  const statusMeta = STATUS_META[status] || STATUS_META.UNPAID;
  const period = invoice
    ? `${String(invoice.billingMonth).padStart(2, "0")}/${invoice.billingYear}`
    : "";

  // Ghi chú dưới tên dòng: chỉ số điện nước lấy từ hóa đơn
  const itemSub = (item) => {
    if (item.itemType === "ELECTRICITY" && invoice?.electricityEnd != null) {
      return `Chỉ số ${formatNumber(invoice.electricityStart)} → ${formatNumber(
        invoice.electricityEnd,
      )}`;
    }
    if (item.itemType === "WATER" && invoice?.waterEnd != null) {
      return `Chỉ số ${formatNumber(invoice.waterStart)} → ${formatNumber(
        invoice.waterEnd,
      )}`;
    }
    if (item.itemType === "ROOM_FEE") {
      return `Theo hợp đồng ${invoice?.contractCode ?? ""}`.trim();
    }
    if (item.itemType === "SURCHARGE" || item.itemType === "DISCOUNT") {
      return "Nhập tay khi lập hóa đơn";
    }
    return "Dịch vụ trong hợp đồng";
  };

  // =========================
  // GHI NHẬN THANH TOÁN
  // =========================
  const openPay = () => {
    setPayAmount(remaining);
    setPayMethod("CASH");
    setPayDate(dayjs());
    setPayRef("");
    setPayNote("");
    setPayErrors(false);
    setPayOpen(true);
  };

  const amountNumber = Number(payAmount) || 0;
  const amountInvalid = amountNumber <= 0 || amountNumber > remaining;
  const refInvalid = payMethod === "BANK_TRANSFER" && !payRef.trim();
  const dateInvalid =
    !payDate ||
    payDate.isAfter(dayjs(), "day") ||
    (invoice?.issueDate && payDate.isBefore(dayjs(invoice.issueDate), "day"));

  const afterPay = Math.max(remaining - amountNumber, 0);

  const handleSubmitPayment = async () => {
    setPayErrors(true);

    if (amountInvalid || refInvalid || dateInvalid) return;

    // Hôm nay: gửi giờ hiện tại (BE kiểm tra không ở tương lai); ngày khác: 12:00
    const paymentDate = payDate.isSame(dayjs(), "day")
      ? dayjs()
      : payDate.hour(12).minute(0).second(0);

    setPaySubmitting(true);

    try {
      const result = await createPayment(invoice.id, {
        amount: amountNumber,
        paymentMethod: payMethod,
        paymentDate: paymentDate.format(API_DATE_TIME_FORMAT),
        transactionCode:
          payMethod === "BANK_TRANSFER" ? payRef.trim() : undefined,
        note: payNote.trim() || undefined,
      });

      notifyRef.current({
        type: "success",
        message: "Ghi nhận thanh toán thành công!",
        description: `Đã thu ${formatMoney(amountNumber)}`,
      });

      setPayOpen(false);
      applyResult(result);
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: "Ghi nhận thanh toán thất bại!",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });

      // Dữ liệu có thể đã đổi (người khác vừa thu tiền): tải lại số liệu
      fetchInvoice({ silent: true });
    } finally {
      setPaySubmitting(false);
    }
  };

  // =========================
  // XÓA THANH TOÁN NHẬP NHẦM
  // =========================
  const handleDeletePayment = async (payment) => {
    try {
      const result = await deletePayment(invoice.id, payment.id);

      notifyRef.current({
        type: "success",
        message: "Đã xóa khoản thanh toán",
      });

      applyResult(result);
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: "Không thể xóa khoản thanh toán",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  };

  // =========================
  // HỦY HÓA ĐƠN
  // =========================
  // Lý do gửi lên BE: nhãn đã chọn, hoặc nội dung nhập tay nếu chọn "Khác"
  const cancelReasonText =
    cancelKey === "OTHER"
      ? cancelOther.trim()
      : (CANCEL_REASONS.find((item) => item.value === cancelKey)?.label ?? "");

  // Tải hóa đơn PDF
  const handleDownloadPdf = async () => {
    if (!invoice?.id || downloadingPdf) return;

    setDownloadingPdf(true);

    try {
      const blob = await downloadInvoicePdf(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `hoa-don-${invoice.invoiceCode || invoice.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: "Tải hóa đơn thất bại",
        description:
          error?.response?.data?.message ||
          "Chưa tạo được file PDF. Vui lòng thử lại.",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const openCancel = () => {
    setCancelKey(null);
    setCancelOther("");
    setCancelOpen(true);
  };

  const handleCancelInvoice = async () => {
    const reason = cancelReasonText;
    if (!reason) return;

    setCancelSubmitting(true);

    try {
      await cancelInvoice(invoice.id, { reason });

      notifyRef.current({
        type: "success",
        message: "Đã hủy hóa đơn",
        description: "Chỉ số điện nước kỳ này đã được mở khóa.",
      });

      setCancelOpen(false);
      fetchInvoice({ silent: true });
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: "Hủy hóa đơn thất bại!",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });

      fetchInvoice({ silent: true });
    } finally {
      setCancelSubmitting(false);
    }
  };

  // =========================
  // RENDER
  // =========================
  if (loading) {
    return (
      <Fragment>
        {contextHolder}
        <div className="invd-loading">
          <Spin size="large" />
        </div>
      </Fragment>
    );
  }

  if (!invoice) {
    return (
      <Fragment>
        {contextHolder}
        <div className="invd">
          <div className="invd-card">
            <h2 className="invd-card__title">Không tìm thấy hóa đơn</h2>
            <span className="invd-empty">
              Hóa đơn không tồn tại hoặc đã bị xóa.
            </span>
            <div>
              <Button onClick={goToList}>Về danh sách hóa đơn</Button>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      {contextHolder}

      <div className="invd">
        {/* ===== TIÊU ĐỀ ===== */}
        <div className="invd-head">
          <div className="invd-head__left">
            <button
              type="button"
              className="invd-back"
              onClick={goToList}
              aria-label="Quay lại danh sách hóa đơn"
            >
              <ArrowLeftOutlined />
            </button>

            <div className="invd-head__text">
              <div className="invd-title-row">
                <h1 className="invd-title">Hóa đơn {invoice.invoiceCode}</h1>
                <span className="invd-status" style={statusMeta.style}>
                  <i />
                  {statusMeta.label}
                </span>
              </div>
              <span className="invd-sub">
                Phòng {invoice.roomNumber} · {invoice.buildingName} · Kỳ{" "}
                {period}
              </span>
            </div>
          </div>

          <div className="invd-actions">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadPdf}
              loading={downloadingPdf}
            >
              Tải hóa đơn
            </Button>

            {canCancel && (
              <Button danger icon={<CloseOutlined />} onClick={openCancel}>
                Hủy hóa đơn
              </Button>
            )}

            {canPay && (
              <Button
                type="primary"
                icon={<CreditCardOutlined />}
                onClick={openPay}
              >
                Ghi nhận thanh toán
              </Button>
            )}
          </div>
        </div>

        {/* ===== THÔNG BÁO THEO TRẠNG THÁI ===== */}
        {isOverdue && (
          <div className="invd-banner invd-banner--danger" role="status">
            <span>
              <ExclamationCircleOutlined />
            </span>
            <div className="invd-banner__text">
              <b>Hóa đơn đã quá hạn thanh toán</b>
              <span>
                Hạn thanh toán là {formatDate(invoice.dueDate)}, khách còn nợ{" "}
                {formatMoney(remaining)}.
              </span>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="invd-banner invd-banner--muted" role="status">
            <span>
              <ExclamationCircleOutlined />
            </span>
            <div className="invd-banner__text">
              <b>Hóa đơn đã bị hủy</b>
              <span>
                Hóa đơn không còn hiệu lực, chỉ số điện nước kỳ này đã được mở
                khóa.
              </span>
            </div>
          </div>
        )}

        <div className="invd-body">
          {/* ===== CỘT TRÁI ===== */}
          <div className="invd-main">
            <section className="invd-card" aria-label="Chi tiết các khoản">
              <div className="invd-card__head">
                <h2 className="invd-card__title">Chi tiết các khoản</h2>
                <span className="invd-count">{items.length} khoản</span>
              </div>

              {items.map((item, index) => {
                const meta = ITEM_META[item.itemType] || DEFAULT_ITEM_META;
                const amount = Number(item.amount || 0);

                return (
                  <div className="invd-item" key={item.id ?? index}>
                    <span className="invd-tile" style={meta.color}>
                      {meta.icon}
                    </span>

                    <div className="invd-item__main">
                      <div className="invd-item__name">
                        <b>{item.itemName}</b>
                        <span className="invd-chip" style={meta.color}>
                          {meta.label}
                        </span>
                      </div>
                      <span className="invd-item__sub">{itemSub(item)}</span>
                    </div>

                    <div className="invd-item__amount">
                      <b className={amount < 0 ? "invd-minus" : undefined}>
                        {formatMoney(amount)}
                      </b>
                      <span>
                        {formatNumber(item.quantity)} ×{" "}
                        {formatMoney(item.unitPrice)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="invd-total">
                <span>Tổng cộng</span>
                <b>{formatMoney(total)}</b>
              </div>
            </section>

            <section className="invd-card" aria-label="Ghi chú">
              <h2 className="invd-card__title">Ghi chú</h2>
              {invoice.note ? (
                <p className="invd-note">{invoice.note}</p>
              ) : (
                <span className="invd-empty">Không có ghi chú.</span>
              )}
            </section>

            <section className="invd-card" aria-label="Lịch sử thanh toán">
              <div className="invd-card__head">
                <h2 className="invd-card__title">Lịch sử thanh toán</h2>
                <span className="invd-count">{payments.length} lần</span>
              </div>

              {payments.map((payment) => {
                const method = HISTORY_METHODS.find(
                  (item) => item.value === payment.paymentMethod,
                );
                // Khoản VNPay do hệ thống ghi nhận, chủ trọ không xóa tay
                const isOnline = payment.paymentMethod === "VNPAY";

                const subParts = [];
                if (payment.transactionCode) {
                  subParts.push(`Mã GD ${payment.transactionCode}`);
                }
                if (payment.note) subParts.push(payment.note);

                return (
                  <div className="invd-item" key={payment.id}>
                    <span
                      className="invd-tile"
                      style={(method || HISTORY_METHODS[0]).color}
                    >
                      {method?.icon ?? <DollarOutlined />}
                    </span>

                    <div className="invd-item__main">
                      <div className="invd-item__name invd-pay-head">
                        <span
                          className="invd-chip invd-chip--method"
                          style={
                            method?.color ?? {
                              background: "#f1f3fb",
                              color: "#5b6385",
                            }
                          }
                        >
                          {method?.label ?? "Khác"}
                        </span>
                        <span className="invd-pay-date">
                          {formatDateTime(payment.paymentDate)}
                        </span>
                      </div>
                      {subParts.length > 0 && (
                        <span className="invd-item__sub">
                          {subParts.join(" · ")}
                        </span>
                      )}
                    </div>

                    <b className="invd-pay-amount">
                      + {formatMoney(payment.amount)}
                    </b>

                    {!isCancelled && !isOnline && (
                      <Popconfirm
                        title="Xóa khoản thanh toán này?"
                        description="Dùng khi ghi nhận nhầm. Số tiền còn lại sẽ được tính lại."
                        okText="Xóa"
                        cancelText="Không"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeletePayment(payment)}
                      >
                        <Button
                          className="invd-pay-del"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label="Xóa khoản thanh toán"
                        />
                      </Popconfirm>
                    )}
                  </div>
                );
              })}

              {payments.length === 0 && (
                <span className="invd-empty">
                  Chưa có khoản thanh toán nào.
                </span>
              )}
            </section>
          </div>

          {/* ===== CỘT PHẢI ===== */}
          <div className="invd-side">
            <section className="invd-card" aria-label="Tình hình thanh toán">
              <h2 className="invd-card__title">Tình hình thanh toán</h2>

              <div className="invd-sum">
                <span>Tổng tiền hóa đơn</span>
                <strong>{formatMoney(total)}</strong>
              </div>

              <dl className="invd-dl">
                <div className="invd-row">
                  <dt>Đã thanh toán</dt>
                  <dd style={{ color: "#137a4b" }}>{formatMoney(paid)}</dd>
                </div>
                <div className="invd-row">
                  <dt>Còn lại</dt>
                  <dd>
                    <span
                      className="invd-chip"
                      style={{
                        minHeight: 28,
                        fontSize: 14,
                        fontWeight: 700,
                        ...(isCancelled
                          ? { background: "#f1f3fb", color: "#5b6385" }
                          : remaining > 0
                            ? { background: "#fff7e6", color: "#d46b08" }
                            : { background: "#e6f6ee", color: "#137a4b" }),
                      }}
                    >
                      {formatMoney(remaining)}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="invd-progress">
                <div className="invd-progress__bar">
                  <div
                    style={{
                      width: `${percent}%`,
                      background: paid >= total ? "#1fa566" : "#fa8c16",
                    }}
                  />
                </div>
                <span>Đã thu {percent}% giá trị hóa đơn</span>
              </div>
            </section>

            <section className="invd-card" aria-label="Thông tin hóa đơn">
              <h2 className="invd-card__title">Thông tin hóa đơn</h2>

              <dl className="invd-dl">
                <div className="invd-row">
                  <dt>Mã hóa đơn</dt>
                  <dd>{invoice.invoiceCode}</dd>
                </div>
                <div className="invd-row">
                  <dt>Kỳ hóa đơn</dt>
                  <dd>Tháng {period}</dd>
                </div>
                <div className="invd-row">
                  <dt>Ngày lập</dt>
                  <dd>{formatDate(invoice.issueDate)}</dd>
                </div>
                <div className="invd-row">
                  <dt>Hạn thanh toán</dt>
                  <dd
                    style={
                      isOverdue ? { color: "#cf1322", fontWeight: 600 } : null
                    }
                  >
                    {formatDate(invoice.dueDate)}
                  </dd>
                </div>
                <div className="invd-row">
                  <dt>Hợp đồng</dt>
                  <dd>{invoice.contractCode}</dd>
                </div>
                <div className="invd-row">
                  <dt>Phòng</dt>
                  <dd>{invoice.roomNumber}</dd>
                </div>
                <div className="invd-row">
                  <dt>Tòa nhà</dt>
                  <dd>{invoice.buildingName}</dd>
                </div>
                <div className="invd-row">
                  <dt>Khách thuê</dt>
                  <dd>{invoice.tenantName}</dd>
                </div>
                <div className="invd-row">
                  <dt>Điện thoại</dt>
                  <dd>{invoice.tenantPhone || "—"}</dd>
                </div>
              </dl>
            </section>

            {isCancelled && (
              <section className="invd-card" aria-label="Thông tin hủy">
                <h2 className="invd-card__title">Thông tin hủy</h2>

                <dl className="invd-dl">
                  <div className="invd-row">
                    <dt>Hủy lúc</dt>
                    <dd>{formatDateTime(invoice.cancelledAt)}</dd>
                  </div>
                  <div className="invd-row">
                    <dt>Người hủy</dt>
                    <dd>{invoice.cancelledBy || "—"}</dd>
                  </div>
                  <div className="invd-row">
                    <dt>Lý do hủy</dt>
                    <dd>{invoice.cancelReason || "—"}</dd>
                  </div>
                </dl>
              </section>
            )}

            <section className="invd-card" aria-label="Thông tin hệ thống">
              <h2 className="invd-card__title">Thông tin hệ thống</h2>

              <dl className="invd-dl">
                <div className="invd-row">
                  <dt>Mã hệ thống</dt>
                  <dd>#{invoice.id}</dd>
                </div>
                <div className="invd-row">
                  <dt>Ngày tạo</dt>
                  <dd>{formatDateTime(invoice.createdAt)}</dd>
                </div>
                <div className="invd-row">
                  <dt>Cập nhật lần cuối</dt>
                  <dd>{formatDateTime(invoice.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>

      {/* ===== MODAL GHI NHẬN THANH TOÁN ===== */}
      <Modal
        open={payOpen}
        rootClassName="invd-modal"
        title={
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              Ghi nhận thanh toán
            </div>
            <div style={{ fontSize: 13, fontWeight: 400, color: "#5b6385" }}>
              Hóa đơn {invoice.invoiceCode} · Phòng {invoice.roomNumber} ·{" "}
              {invoice.tenantName}
            </div>
          </div>
        }
        onCancel={() => !paySubmitting && setPayOpen(false)}
        maskClosable={!paySubmitting}
        destroyOnHidden
        width={560}
        okText="Lưu thanh toán"
        cancelText="Hủy"
        okButtonProps={{ icon: <CheckOutlined /> }}
        confirmLoading={paySubmitting}
        onOk={handleSubmitPayment}
      >
        <div className="invd-pay-stats">
          <div style={{ background: "#f6f7fd" }}>
            <span style={{ color: "#5b6385" }}>Tổng hóa đơn</span>
            <b>{formatMoney(total)}</b>
          </div>
          <div style={{ background: "#e6f6ee" }}>
            <span style={{ color: "#137a4b" }}>Đã thanh toán</span>
            <b style={{ color: "#137a4b" }}>{formatMoney(paid)}</b>
          </div>
          <div style={{ background: "#fff7e6" }}>
            <span style={{ color: "#d46b08" }}>Còn lại</span>
            <b style={{ color: "#d46b08" }}>{formatMoney(remaining)}</b>
          </div>
        </div>

        <div className="invd-field">
          <label htmlFor="pay-amount">
            Số tiền thu lần này <i>*</i>
          </label>
          <InputNumber
            id="pay-amount"
            className="invd-amount"
            min={0}
            max={remaining}
            step={10000}
            precision={0}
            value={payAmount}
            onChange={setPayAmount}
            controls={false}
            addonAfter="đ"
            formatter={moneyFormatter}
            parser={moneyParser}
            status={payErrors && amountInvalid ? "error" : undefined}
          />
          <div className="invd-quick">
            <Button
              size="small"
              shape="round"
              type={amountNumber === remaining ? "primary" : "default"}
              ghost={amountNumber === remaining}
              onClick={() => setPayAmount(remaining)}
            >
              Trả hết {formatMoney(remaining)}
            </Button>
            <Button
              size="small"
              shape="round"
              onClick={() => setPayAmount(Math.round(remaining / 2))}
            >
              Trả một nửa
            </Button>
            <small>Không vượt quá số còn lại</small>
          </div>
          {payErrors && amountInvalid && (
            <span className="invd-error">
              Số tiền phải lớn hơn 0 và không vượt quá {formatMoney(remaining)}.
            </span>
          )}
        </div>

        <div className="invd-field">
          <label>
            Hình thức <i>*</i>
          </label>
          <div className="invd-methods">
            {PAYMENT_METHODS.map((method) => (
              <button
                type="button"
                key={method.value}
                className={`invd-method${
                  payMethod === method.value ? " invd-method--on" : ""
                }`}
                onClick={() => setPayMethod(method.value)}
              >
                <span className="invd-tile" style={method.color}>
                  {method.icon}
                </span>
                <span>
                  <b>{method.label}</b>
                  <small>{method.hint}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <div className="invd-field">
            <label htmlFor="pay-date">
              Ngày trả <i>*</i>
            </label>
            <DatePicker
              id="pay-date"
              format={DATE_FORMAT}
              value={payDate}
              allowClear={false}
              onChange={setPayDate}
              disabledDate={(current) =>
                current &&
                (current.isAfter(dayjs(), "day") ||
                  (invoice.issueDate &&
                    current.isBefore(dayjs(invoice.issueDate), "day")))
              }
              status={payErrors && dateInvalid ? "error" : undefined}
            />
            {payErrors && dateInvalid && (
              <span className="invd-error">
                Ngày trả không được sau hôm nay hoặc trước ngày lập.
              </span>
            )}
          </div>

          {payMethod === "BANK_TRANSFER" && (
            <div className="invd-field">
              <label htmlFor="pay-ref">
                Mã giao dịch <i>*</i>
              </label>
              <Input
                id="pay-ref"
                maxLength={100}
                placeholder="VD: FT26103101"
                value={payRef}
                onChange={(event) => setPayRef(event.target.value)}
                status={payErrors && refInvalid ? "error" : undefined}
              />
              {payErrors && refInvalid && (
                <span className="invd-error">
                  Chuyển khoản cần có mã giao dịch.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="invd-field">
          <label htmlFor="pay-note">Ghi chú</label>
          <TextArea
            id="pay-note"
            rows={2}
            maxLength={300}
            placeholder="Ví dụ: Khách trả trước một phần"
            value={payNote}
            onChange={(event) => setPayNote(event.target.value)}
          />
        </div>

        <div className="invd-after">
          <span>Sau khi lưu, còn lại</span>
          <b style={{ color: afterPay === 0 ? "#137a4b" : "#d46b08" }}>
            {formatMoney(afterPay)}
          </b>
        </div>
      </Modal>

      {/* ===== MODAL HỦY HÓA ĐƠN ===== */}
      <Modal
        open={cancelOpen}
        rootClassName="invd-modal"
        title="Hủy hóa đơn"
        onCancel={() => !cancelSubmitting && setCancelOpen(false)}
        maskClosable={!cancelSubmitting}
        destroyOnHidden
        okText="Xác nhận hủy"
        cancelText="Đóng"
        okButtonProps={{ danger: true, disabled: !cancelReasonText }}
        confirmLoading={cancelSubmitting}
        onOk={handleCancelInvoice}
      >
        <div className="invd-warn">
          <ExclamationCircleOutlined />
          <span>
            Hóa đơn <b>{invoice.invoiceCode}</b> sẽ không còn hiệu lực và chỉ số
            điện nước của kỳ này được mở khóa để lập lại. Chỉ hủy được khi chưa
            có thanh toán.
          </span>
        </div>

        <div className="invd-field" style={{ marginBottom: 0 }}>
          <label id="cancel-reason-label">
            Lý do hủy <i>*</i>
          </label>

          <div
            className="invd-reasons"
            role="radiogroup"
            aria-labelledby="cancel-reason-label"
          >
            {CANCEL_REASONS.map((reason) => (
              <button
                type="button"
                key={reason.value}
                role="radio"
                aria-checked={cancelKey === reason.value}
                className={`invd-reason${
                  cancelKey === reason.value ? " invd-reason--on" : ""
                }`}
                onClick={() => setCancelKey(reason.value)}
              >
                <span className="invd-reason__dot" />
                {reason.label}
              </button>
            ))}
          </div>

          {cancelKey === "OTHER" && (
            <TextArea
              id="cancel-reason"
              rows={3}
              maxLength={300}
              showCount
              autoFocus
              placeholder="Nhập lý do hủy hóa đơn"
              value={cancelOther}
              onChange={(event) => setCancelOther(event.target.value)}
            />
          )}
        </div>
      </Modal>
    </Fragment>
  );
};

export default InvoiceDetail;
