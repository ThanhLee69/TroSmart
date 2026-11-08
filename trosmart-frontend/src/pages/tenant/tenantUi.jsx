import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Empty, Skeleton } from "antd";
import dayjs from "dayjs";
import "./tenant.css";

// ---------- Định dạng ----------
export const formatMoney = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value || 0))} đ`;

export const formatDate = (value, format = "DD/MM/YYYY") =>
  value ? dayjs(value).format(format) : "—";

export const formatDateTime = (value) => formatDate(value, "HH:mm, DD/MM/YYYY");

export const errorMessage = (error) =>
  error?.response?.data?.message || "Vui lòng thử lại sau.";

// ---------- Trạng thái: nhãn + tông màu (xanh lá, cam, đỏ, xanh dương, xám) ----------
export const INVOICE_STATUS = {
  UNPAID: { label: "Chưa đóng", tone: "orange" },
  PARTIALLY_PAID: { label: "Đóng một phần", tone: "blue" },
  PAID: { label: "Đã đóng", tone: "green" },
  OVERDUE: { label: "Quá hạn", tone: "red" },
  CANCELLED: { label: "Đã hủy", tone: "gray" },
};

export const ISSUE_STATUS = {
  PENDING: { label: "Chờ xử lý", tone: "orange" },
  PROCESSING: { label: "Đang xử lý", tone: "blue" },
  WAITING: { label: "Tạm chờ", tone: "orange" },
  COMPLETED: { label: "Đã xong", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "gray" },
};

export const ISSUE_CATEGORY_LABEL = {
  ELECTRICITY: "Điện",
  WATER: "Nước",
  EQUIPMENT: "Thiết bị",
  FURNITURE: "Nội thất",
  DOOR_LOCK: "Cửa, khóa",
  OTHER: "Khác",
};

export const VEHICLE_TYPE_LABEL = {
  MOTORBIKE: "Xe máy",
  ELECTRIC_BICYCLE: "Xe đạp điện",
  BICYCLE: "Xe đạp",
};

// Hóa đơn quá hạn nhưng hệ thống chưa chuyển trạng thái thì vẫn hiện "Quá hạn"
export const invoiceStatusOf = (invoice) =>
  invoice?.overdue && invoice.status !== "OVERDUE"
    ? "OVERDUE"
    : invoice?.status;

export const CONTRACT_STATUS = {
  ACTIVE: { label: "Đang hiệu lực", tone: "green" },
  DRAFT: { label: "Chưa hiệu lực", tone: "gray" },
  EXPIRED: { label: "Đã hết hạn", tone: "gray" },
  TERMINATED: { label: "Đã chấm dứt", tone: "red" },
};

export const PAYMENT_CYCLE_LABEL = {
  MONTHLY: "Hàng tháng",
  QUARTERLY: "Hàng quý",
  HALF_YEARLY: "6 tháng một lần",
  YEARLY: "Hàng năm",
};

export const NOTIFICATION_TONE = {
  ANNOUNCEMENT: "blue",
  MAINTENANCE: "orange",
  PAYMENT_REMINDER: "red",
  CONTRACT: "green",
};

export const statusMeta = (map, value) =>
  map[value] || { label: value || "—", tone: "gray" };

// ---------- Thành phần dùng chung ----------
export const StatusPill = ({ meta }) => (
  <span className={`tn-pill tn-tone--${meta.tone}`}>
    <i />
    {meta.label}
  </span>
);

export const PageHead = ({ title, desc, extra }) => (
  <div className="tn-head">
    <div>
      <h1>{title}</h1>
      {desc && <p>{desc}</p>}
    </div>
    {extra}
  </div>
);

export const Section = ({ title, extra, children, className = "" }) => (
  <section className={`tn-card ${className}`}>
    {(title || extra) && (
      <div className="tn-card__head">
        <h2>{title}</h2>
        {extra}
      </div>
    )}
    {children}
  </section>
);

export const InfoRow = ({ label, value }) => (
  <div className="tn-info">
    <span>{label}</span>
    <b>{value ?? "—"}</b>
  </div>
);

// Gọi API khi mở trang, có tải lại và bỏ kết quả cũ khi đổi tham số
export function useLoad(loader, deps = []) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [state, setState] = useState({
    data: null,
    loading: true,
    error: false,
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: false }));

    try {
      const data = await loaderRef.current();
      setState({ data, loading: false, error: false });
    } catch (error) {
      setState({ data: null, loading: false, error: error || true });
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    ...state,
    reload,
    setData: (data) => setState((s) => ({ ...s, data })),
  };
}

// Hiện khung chờ / lỗi / rỗng, còn lại hiện nội dung
export const AsyncBlock = ({
  loading,
  error,
  onRetry,
  isEmpty,
  emptyText = "Chưa có dữ liệu",
  children,
}) => {
  if (loading) {
    return (
      <div className="tn-card">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tn-card tn-state">
        <p>Không thể tải dữ liệu.</p>
        <Button onClick={onRetry}>Thử lại</Button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="tn-card">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      </div>
    );
  }

  return children;
};
