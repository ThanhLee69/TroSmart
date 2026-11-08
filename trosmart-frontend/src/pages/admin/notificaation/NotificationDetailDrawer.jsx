import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Drawer,
  Empty,
  Grid,
  Pagination,
  Popconfirm,
  Segmented,
  Spin,
} from "antd";
import {
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getNotificationById,
  getNotificationRecipients,
} from "../../../api/notificationApi";
import { useNotify } from "../../../components/NotificationProvider";
import {
  DISPLAY_DATE_TIME_FORMAT,
  NOTIFICATION_PRIORITY_COLORS,
  NOTIFICATION_PRIORITY_OPTIONS,
  NOTIFICATION_STATUS_COLORS,
  NOTIFICATION_STATUS_OPTIONS,
  NOTIFICATION_TARGET_LABELS,
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_TYPE_LABELS,
  canDeleteNotification,
  canEditNotification,
  canSendNotification,
} from "./notificationConstants";
import "./NotificationDialogs.css";

const { useBreakpoint } = Grid;

const RECIPIENT_PAGE_SIZE = 10;

const READ_FILTER_OPTIONS = [
  { value: "ALL", label: "Tất cả" },
  { value: "UNREAD", label: "Chưa đọc" },
  { value: "READ", label: "Đã đọc" },
];

const formatDateTime = (value) =>
  value ? dayjs(value).format(DISPLAY_DATE_TIME_FORMAT) : "—";

const labelOf = (options, value) =>
  options.find((option) => option.value === value)?.label ?? value;

// Tên màu của constants (antd) -> class tông màu trong CSS
const toneOf = (color) => `nt-tone--${color || "default"}`;

// Màu chấm của mức độ ưu tiên; chưa khai báo thì "Cao" đỏ, còn lại xám
const priorityColor = (value) =>
  NOTIFICATION_PRIORITY_COLORS[value] || (value === "HIGH" ? "red" : "default");

// Chữ cái đầu của họ và tên: "Nguyễn Văn An" -> "NA"
const initialsOf = (name) => {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/**
 * Drawer xem chi tiết thông báo, người nhận và các thao tác.
 * - onAction(action, record): "send" | "delete", trang cha thực hiện rồi tăng reloadKey
 * - onEdit(record): mở form sửa
 */
const NotificationDetailDrawer = ({
  open,
  notificationId,
  reloadKey,
  onClose,
  onAction,
  onEdit,
}) => {
  const { notify, contextHolder } = useNotify();
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const [readFilter, setReadFilter] = useState("ALL");
  const [recipients, setRecipients] = useState({ items: [], totalItems: 0 });
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientPage, setRecipientPage] = useState(1);

  // =========================
  // TẢI CHI TIẾT
  // =========================
  const fetchDetail = useCallback(async () => {
    if (!notificationId) return;

    setLoading(true);

    try {
      setDetail(await getNotificationById(notificationId));
    } catch (error) {
      setDetail(null);

      notifyRef.current({
        type: "error",
        message: "Không thể tải thông báo",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    if (!open) return;

    setReadFilter("ALL");
    setRecipientPage(1);
    fetchDetail();
  }, [open, fetchDetail, reloadKey]);

  // =========================
  // TẢI NGƯỜI NHẬN (chỉ khi đã gửi)
  // =========================
  const isSent = detail?.status === "SENT";

  const fetchRecipients = useCallback(async () => {
    if (!notificationId || !isSent) {
      setRecipients({ items: [], totalItems: 0 });
      return;
    }

    setRecipientsLoading(true);

    try {
      const data = await getNotificationRecipients(notificationId, {
        isRead: readFilter === "ALL" ? undefined : readFilter === "READ",
        page: recipientPage,
        size: RECIPIENT_PAGE_SIZE,
      });

      setRecipients({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      setRecipients({ items: [], totalItems: 0 });

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách người nhận",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setRecipientsLoading(false);
    }
  }, [notificationId, isSent, readFilter, recipientPage]);

  useEffect(() => {
    if (open) fetchRecipients();
  }, [open, fetchRecipients, reloadKey]);

  // =========================
  // GIÁ TRỊ SUY RA
  // =========================
  const status = detail?.status;
  const total = detail?.recipientCount ?? 0;
  const read = detail?.readCount ?? 0;
  const percent = total > 0 ? Math.round((read / total) * 100) : 0;

  const timeRows = [];
  if (detail?.scheduledAt && status !== "SENT") {
    timeRows.push({
      label: "Hẹn gửi lúc",
      value: formatDateTime(detail.scheduledAt),
    });
  }
  if (detail?.sentAt) {
    timeRows.push({
      label: "Đã gửi lúc",
      value: formatDateTime(detail.sentAt),
    });
  }

  // =========================
  // THAO TÁC: nằm ở chân drawer, dễ bấm trên điện thoại
  // =========================
  const confirmPlacement = isMobile ? "top" : "topRight";

  const dangerButtons = [
    canDeleteNotification(status) && (
      <Popconfirm
        key="delete"
        title="Xóa thông báo này?"
        okText="Xóa"
        cancelText="Không"
        placement={confirmPlacement}
        okButtonProps={{ danger: true }}
        onConfirm={() => onAction?.("delete", detail)}
      >
        <Button danger icon={<DeleteOutlined />}>
          Xóa
        </Button>
      </Popconfirm>
    ),
  ].filter(Boolean);

  const mainButtons = [
    canEditNotification(status) && (
      <Button
        key="edit"
        icon={<EditOutlined />}
        onClick={() => onEdit?.(detail)}
      >
        Sửa
      </Button>
    ),
    canSendNotification(status) && (
      <Popconfirm
        key="send"
        title="Gửi thông báo ngay?"
        description="Gửi cho khách đang thuê thuộc đối tượng đã chọn."
        okText="Gửi"
        cancelText="Không"
        placement={confirmPlacement}
        onConfirm={() => onAction?.("send", detail)}
      >
        <Button
          type="primary"
          icon={<SendOutlined />}
          className="nt-actions__primary"
        >
          Gửi ngay
        </Button>
      </Popconfirm>
    ),
  ].filter(Boolean);

  // Thông báo đã gửi / đã hủy không có thao tác nào thì không hiện chân drawer
  const footer =
    detail && (dangerButtons.length > 0 || mainButtons.length > 0) ? (
      <div className="nt-actions">
        {dangerButtons.length > 0 && (
          <div className="nt-actions__group nt-actions__group--danger">
            {dangerButtons}
          </div>
        )}

        {mainButtons.length > 0 && (
          <div className="nt-actions__group nt-actions__group--main">
            {mainButtons}
          </div>
        )}
      </div>
    ) : null;

  // =========================
  // RENDER
  // =========================
  return (
    <>
      {contextHolder}

      <Drawer
        open={open}
        onClose={onClose}
        width="min(520px, 100vw)"
        rootClassName="nt-drawer"
        title="Chi tiết thông báo"
        destroyOnClose
        // Điện thoại: kéo từ dưới lên; máy tính: bên phải
        placement={isMobile ? "bottom" : "right"}
        height="92%"
        footer={footer}
      >
        <Spin spinning={loading}>
          {detail && (
            <div className="nt-detail">
              {/* Đầu trang: trạng thái, loại, mức ưu tiên và tiêu đề */}
              <header className="nt-hero">
                <span
                  className={`nt-status ${toneOf(NOTIFICATION_STATUS_COLORS[status])}`}
                >
                  {labelOf(NOTIFICATION_STATUS_OPTIONS, status)}
                </span>

                <h2 className="nt-hero__title">{detail.title}</h2>

                <div className="nt-hero__meta">
                  <span
                    className={`nt-meta-text ${toneOf(NOTIFICATION_TYPE_COLORS[detail.type])}`}
                  >
                    <i className="nt-dot" />
                    {NOTIFICATION_TYPE_LABELS[detail.type] ?? detail.type}
                  </span>

                  <span
                    className={`nt-meta-text ${toneOf(priorityColor(detail.priority))}`}
                  >
                    <i className="nt-dot" />
                    {labelOf(NOTIFICATION_PRIORITY_OPTIONS, detail.priority)}
                  </span>
                </div>
              </header>

              {/* Thông tin chung */}
              <section>
                <div className="nt-section-head">
                  <h3>Thông tin</h3>
                </div>

                <dl className="nt-info">
                  <div className="nt-info__row">
                    <dt>Gửi cho</dt>
                    <dd>
                      <span>{detail.targetName || "—"}</span>
                    </dd>
                  </div>

                  {timeRows.map((row) => (
                    <div className="nt-info__row" key={row.label}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}

                  <div className="nt-info__row">
                    <dt>Người tạo</dt>
                    <dd>{detail.createdBy || "—"}</dd>
                  </div>

                  <div className="nt-info__row">
                    <dt>Ngày tạo</dt>
                    <dd>{formatDateTime(detail.createdAt)}</dd>
                  </div>
                </dl>
              </section>

              {/* Nội dung */}
              <section>
                <div className="nt-section-head">
                  <h3>Nội dung</h3>
                </div>

                <p className="nt-content">{detail.content}</p>
              </section>

              {/* Người nhận */}
              {isSent && (
                <section>
                  <div className="nt-section-head">
                    <h3>Người nhận</h3>
                    <span>{total} khách thuê</span>
                  </div>

                  <div className="nt-read">
                    <div className="nt-read__top">
                      <span className="nt-read__num">
                        {read}/{total}
                        <small>đã đọc</small>
                      </span>
                      <span className="nt-read__pct">{percent}%</span>
                    </div>

                    <div
                      className="nt-bar"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  <Segmented
                    options={READ_FILTER_OPTIONS}
                    value={readFilter}
                    onChange={(value) => {
                      setReadFilter(value);
                      setRecipientPage(1);
                    }}
                  />

                  <Spin spinning={recipientsLoading}>
                    {recipients.items.length > 0 ? (
                      <ul className="nt-people">
                        {recipients.items.map((record) => (
                          <li className="nt-person" key={record.id}>
                            <span className="nt-avatar" aria-hidden="true">
                              {initialsOf(record.tenantName)}
                            </span>

                            <div className="nt-person__main">
                              <b>{record.tenantName || "—"}</b>
                              <span>{record.tenantPhone || "—"}</span>
                            </div>

                            <div
                              className={`nt-person__state ${record.isRead ? "is-read" : ""}`}
                            >
                              {record.isRead ? (
                                <>
                                  <span>
                                    <CheckCircleFilled /> Đã đọc
                                  </span>
                                  {record.readAt && (
                                    <small>
                                      {formatDateTime(record.readAt)}
                                    </small>
                                  )}
                                </>
                              ) : (
                                <span>
                                  <i className="nt-dot nt-tone--default" />
                                  Chưa đọc
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Không có người nhận"
                        style={{ padding: "24px 0" }}
                      />
                    )}
                  </Spin>

                  <div className="nt-pager">
                    <Pagination
                      size="small"
                      current={recipientPage}
                      pageSize={RECIPIENT_PAGE_SIZE}
                      total={recipients.totalItems}
                      showSizeChanger={false}
                      hideOnSinglePage
                      onChange={setRecipientPage}
                    />
                  </div>
                </section>
              )}
            </div>
          )}
        </Spin>
      </Drawer>
    </>
  );
};

export default NotificationDetailDrawer;
