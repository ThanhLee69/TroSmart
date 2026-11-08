import { useEffect, useState } from "react";
import { Button, Drawer, Grid, Segmented } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../../api/myTenantApi";
import { useNotify } from "../../components/NotificationProvider";
import { tenant_path_name } from "../../constants/path_name";
import {
  AsyncBlock,
  PageHead,
  errorMessage,
  formatDateTime,
  useLoad,
} from "./tenantUi";

const { useBreakpoint } = Grid;

// Màu nhãn (nền + chữ)
const TONE = {
  gray: { bg: "#f1f3fb", c: "#5b6385" },
  blue: { bg: "#eef0fd", c: "#3b4bcb" },
  orange: { bg: "#fff4e0", c: "#b26a00" },
  red: { bg: "#fff1f0", c: "#cf1322" },
};

// Tên và màu nhãn theo loại thông báo (khớp enum NotificationType ở backend)
const TYPE_META = {
  ANNOUNCEMENT: { label: "Thông báo chung", tone: TONE.gray },
  MAINTENANCE: { label: "Bảo trì", tone: TONE.orange },
  INVOICE_CREATED: { label: "Hóa đơn", tone: TONE.blue },
  PAYMENT_REMINDER: { label: "Nhắc đóng tiền", tone: TONE.blue },
  CONTRACT_EXPIRING: { label: "Hợp đồng", tone: TONE.orange },
  SYSTEM: { label: "Hệ thống", tone: TONE.gray },
};
const DEFAULT_TYPE = { label: "Thông báo", tone: TONE.gray };

// Chỉ hiện nhãn cho mức khác bình thường
const PRIORITY_META = {
  IMPORTANT: { label: "Quan trọng", tone: TONE.orange },
  URGENT: { label: "Khẩn cấp", tone: TONE.red },
};

// Bấm "Xem ..." trong chi tiết thông báo thì mở trang nào (đường dẫn lấy từ tenant_path_name).
// relatedId là id hóa đơn / hợp đồng do backend gắn vào thông báo.
const RELATED_LINK = {
  INVOICE_CREATED: {
    label: "Xem hóa đơn",
    needsId: true,
    path: (id) => tenant_path_name.invoiceDetail.replace(":id", id),
  },
  PAYMENT_REMINDER: {
    label: "Xem hóa đơn",
    needsId: true,
    path: (id) => tenant_path_name.invoiceDetail.replace(":id", id),
  },
  CONTRACT_EXPIRING: {
    label: "Xem phòng của tôi",
    needsId: false,
    path: () => tenant_path_name.contract,
  },
};

// Nhóm loại cho các tab lọc
const GROUP_TYPES = {
  INVOICE: ["INVOICE_CREATED", "PAYMENT_REMINDER"],
  MAINTENANCE: ["MAINTENANCE"],
  OTHER: ["ANNOUNCEMENT", "CONTRACT_EXPIRING", "SYSTEM"],
};

const EMPTY_TEXT = {
  ALL: "Chưa có thông báo",
  UNREAD: "Bạn đã đọc hết thông báo",
  INVOICE: "Chưa có thông báo về hóa đơn",
  MAINTENANCE: "Chưa có thông báo bảo trì",
  OTHER: "Chưa có thông báo khác",
};

// "Hôm nay, 08:30" / "Hôm qua, 09:00" / "30/10/2026"
const formatWhen = (value) => {
  if (!value) return "";

  const date = dayjs(value);
  if (!date.isValid()) return "";

  const time = date.format("HH:mm");

  if (date.isSame(dayjs(), "day")) return `Hôm nay, ${time}`;
  if (date.isSame(dayjs().subtract(1, "day"), "day")) return `Hôm qua, ${time}`;

  return date.format("DD/MM/YYYY");
};

const Chip = ({ meta, dot = false }) => (
  <span
    className={`ti-chip ${dot ? "ti-chip--dot" : ""}`}
    style={{ "--bg": meta.tone.bg, "--c": meta.tone.c }}
  >
    {meta.label}
  </span>
);

export default function TenantNotifications() {
  const { notify, contextHolder } = useNotify();
  const screens = useBreakpoint();
  const navigate = useNavigate();

  const [filter, setFilter] = useState("ALL");
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);

  const [unreadCount, setUnreadCount] = useState(0);

  // Mỗi lần đổi tab thì hỏi server theo đúng bộ lọc của tab đó
  const { data, loading, error, reload } = useLoad(
    () =>
      getMyNotifications({
        page: 1,
        size: 50,
        unreadOnly: filter === "UNREAD",
        types: GROUP_TYPES[filter], // ALL / UNREAD không có nhóm -> lấy mọi loại
      }),
    [filter],
  );

  useEffect(() => {
    // Chuẩn hóa cờ đã đọc: backend trả isRead (Boolean), phòng khi trả read
    setItems(
      (data?.items ?? []).map((n) => ({
        ...n,
        isRead: Boolean(n.isRead ?? n.read),
      })),
    );
  }, [data]);

  // Số chưa đọc lấy riêng từ server nên luôn đúng dù đang ở tab nào
  const { data: unreadData } = useLoad(
    () => getMyUnreadNotificationCount(),
    [],
  );

  useEffect(() => {
    setUnreadCount(Number(unreadData ?? 0));
  }, [unreadData]);

  const filterOptions = [
    { value: "ALL", label: "Tất cả" },
    {
      value: "UNREAD",
      label: unreadCount > 0 ? `Chưa đọc · ${unreadCount}` : "Chưa đọc",
    },
    { value: "INVOICE", label: "Hóa đơn" },
    { value: "MAINTENANCE", label: "Bảo trì" },
    { value: "OTHER", label: "Khác" },
  ];

  const open = async (item) => {
    setActive(item);
    if (item.isRead) return;

    // Cập nhật ngay trên màn hình, báo server sau
    setItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await markMyNotificationRead(item.id);
    } catch (err) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: false } : n)),
      );
      setUnreadCount((count) => count + 1);
      notify({
        type: "error",
        message: "Không đánh dấu được đã đọc",
        description: errorMessage(err),
      });
    }
  };

  const readAll = async () => {
    try {
      await markAllMyNotificationsRead();
      setUnreadCount(0);
      // Tab "Chưa đọc" thì không còn gì để hiện, các tab khác chỉ đổi trạng thái
      setItems((prev) =>
        filter === "UNREAD" ? [] : prev.map((n) => ({ ...n, isRead: true })),
      );
    } catch (err) {
      notify({
        type: "error",
        message: "Thao tác thất bại",
        description: errorMessage(err),
      });
    }
  };

  const activeType = TYPE_META[active?.type] || DEFAULT_TYPE;
  const activePriority = PRIORITY_META[active?.priority];

  // Chỉ hiện nút khi loại thông báo có trang để mở (và có id nếu trang cần id)
  const link = RELATED_LINK[active?.type];
  const activeLink =
    link && (!link.needsId || active?.relatedId != null) ? link : null;

  const goRelated = () => {
    navigate(activeLink.path(active.relatedId));
    setActive(null);
  };

  return (
    // ti-page: cùng độ rộng tối đa (1100px) với trang Yêu cầu sửa chữa
    <div className="tn-page ti-page">
      {contextHolder}

      <PageHead
        title="Thông báo"
        desc="Thông báo từ chủ trọ gửi đến phòng của bạn."
        extra={
          unreadCount > 0 && (
            <Button
              className="tnf-btn"
              icon={<CheckOutlined />}
              onClick={readAll}
            >
              {screens.md ? "Đánh dấu đã đọc tất cả" : "Đọc tất cả"}
            </Button>
          )
        }
      />

      <div className="tnf-filter">
        <Segmented
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </div>

      <AsyncBlock
        loading={loading}
        error={error}
        onRetry={reload}
        isEmpty={items.length === 0}
        emptyText={EMPTY_TEXT[filter]}
      >
        <div className="tnf-list">
          {items.map((item) => {
            const typeMeta = TYPE_META[item.type] || DEFAULT_TYPE;
            const priorityMeta = PRIORITY_META[item.priority];

            return (
              <button
                key={item.id}
                type="button"
                className={`tnf-item ${item.isRead ? "" : "is-unread"}`}
                onClick={() => open(item)}
              >
                <span className="tnf-dot" aria-hidden="true" />

                <span className="tnf-main">
                  <span className="tnf-title-row">
                    {!item.isRead && <span className="tnf-sr">Chưa đọc: </span>}
                    <span className="tnf-title">{item.title}</span>
                    <Chip meta={typeMeta} />
                    {priorityMeta && <Chip meta={priorityMeta} dot />}
                  </span>

                  <span className="tnf-body">{item.content}</span>

                  <span className="tnf-time">{formatWhen(item.sentAt)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </AsyncBlock>

      <Drawer
        open={!!active}
        title={activeType.label}
        placement={screens.md ? "right" : "bottom"}
        height="80%"
        width={460}
        onClose={() => setActive(null)}
      >
        {active && (
          <div className="tn-page" style={{ padding: 0 }}>
            <div className="tnf-title-row">
              <Chip meta={activeType} />
              {activePriority && <Chip meta={activePriority} dot />}
            </div>
            <h2 style={{ margin: 0, fontSize: 19, lineHeight: 1.4 }}>
              {active.title}
            </h2>
            <div className="tn-item__sub">{formatDateTime(active.sentAt)}</div>
            <p style={{ margin: 0, whiteSpace: "pre-line", lineHeight: 1.7 }}>
              {active.content}
            </p>

            {activeLink && (
              <Button type="primary" onClick={goRelated}>
                {activeLink.label}
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
