import { useState } from "react";
import dayjs from "dayjs";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  FileTextOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { getMyDashboard } from "../../api/myTenantApi";
import { tenant_path_name } from "../../constants/path_name";
import { AsyncBlock, formatDate, formatMoney, useLoad } from "./tenantUi";

const EXPIRING_DAYS = 30;

// Nội quy nhà trọ (viết cứng, sửa nội dung ở đây). Hiện 5 điều đầu, bấm "Xem thêm" để xem hết.
const HOUSE_RULES = [
  "Giữ gìn vệ sinh chung, bỏ rác đúng nơi quy định.",
  "Giữ yên tĩnh sau 22h, không gây ồn ảnh hưởng người xung quanh.",
  "Khách đến chơi cần báo với chủ trọ, không cho người lạ ở qua đêm khi chưa được đồng ý.",
  "Đóng tiền phòng và các khoản phí đúng hạn mỗi tháng.",
  "Gửi xe đúng nơi quy định, giữ gìn tài sản và khóa cửa khi ra ngoài.",
  "Tắt điện, nước, quạt, máy lạnh khi không sử dụng.",
  "Không nấu ăn bằng bếp than, không dùng thiết bị điện công suất lớn khi chưa được cho phép.",
  "Không tự ý sửa chữa hoặc thay đổi hệ thống điện nước, báo chủ trọ khi có hư hỏng.",
  "Không tự ý cho thuê lại hoặc nhường phòng cho người khác.",
  "Tuyệt đối không tàng trữ chất cấm, vật liệu cháy nổ.",
];
const RULES_PREVIEW = 5;

const INVOICE_STATUS = {
  UNPAID: { label: "Chưa đóng", bg: "#fff3e0", c: "#b25e00" },
  PARTIALLY_PAID: { label: "Đóng một phần", bg: "#eaf0ff", c: "#3b55d9" },
  OVERDUE: { label: "Quá hạn", bg: "#fdecec", c: "#c0392b" },
  PAID: { label: "Đã đóng", bg: "#e8f7ee", c: "#1c7a45" },
  CANCELLED: { label: "Đã hủy", bg: "#f1f2f7", c: "#5b6385" },
};

const ISSUE_STATUS = {
  PENDING: { label: "Chờ tiếp nhận", bg: "#fff3e0", c: "#b25e00" },
  ACCEPTED: { label: "Đã tiếp nhận", bg: "#eaf0ff", c: "#3b55d9" },
  IN_PROGRESS: { label: "Đang xử lý", bg: "#eaf0ff", c: "#3b55d9" },
  COMPLETED: { label: "Hoàn tất", bg: "#e8f7ee", c: "#1c7a45" },
  CANCELLED: { label: "Đã hủy", bg: "#f1f2f7", c: "#5b6385" },
};

const NOTI_TYPE = {
  ANNOUNCEMENT: "Thông báo",
  MAINTENANCE: "Bảo trì",
  INVOICE_CREATED: "Hóa đơn",
  PAYMENT_REMINDER: "Nhắc đóng tiền",
  CONTRACT_EXPIRING: "Hợp đồng",
  SYSTEM: "Hệ thống",
};

const FALLBACK_META = { bg: "#f1f2f7", c: "#5b6385" };

const metaOf = (map, key) =>
  map[key] ?? { ...FALLBACK_META, label: key ?? "—" };

function Chip({ meta }) {
  return (
    <span className="td-chip" style={{ "--bg": meta.bg, "--c": meta.c }}>
      {meta.label}
    </span>
  );
}

function ListCard({
  title,
  icon,
  badge,
  onAll,
  children,
  empty,
  className = "",
}) {
  return (
    <section className={`td-card ${className}`}>
      <div className="td-card__head">
        <h2 className="td-card__title">
          <span className="td-card__icon">{icon}</span>
          {title}
          {badge > 0 && <span className="td-badge">{badge}</span>}
        </h2>
        <button type="button" className="td-link" onClick={onAll}>
          Xem tất cả
          <RightOutlined />
        </button>
      </div>
      {empty ? <div className="td-empty">{empty}</div> : children}
    </section>
  );
}

export default function TenantHome() {
  const navigate = useNavigate();
  const dashboard = useLoad(getMyDashboard, []);
  const d = dashboard.data;
  const [showAllRules, setShowAllRules] = useState(false);

  const go = (path) => navigate(path);
  const goInvoice = (id) =>
    go(
      id
        ? tenant_path_name.invoiceDetail.replace(":id", id)
        : tenant_path_name.invoice,
    );

  const hasDue = d && Number(d.amountDue) > 0;
  const overdue =
    hasDue && d.dueDate && dayjs(d.dueDate).isBefore(dayjs(), "day");

  const daysLeft = d?.daysToContractEnd;
  const hasContract = d?.contractEndDate != null;
  const expired = hasContract && daysLeft <= 0;
  const expiring = hasContract && !expired && daysLeft <= EXPIRING_DAYS;
  const tone = expired ? "is-red" : expiring ? "is-orange" : "";

  const invoices = d?.recentInvoices ?? [];
  const notifications = d?.recentNotifications ?? [];
  const issues = d?.recentIssues ?? [];

  return (
    <div className="tn-page td-page">
      <AsyncBlock
        loading={dashboard.loading}
        error={dashboard.error}
        onRetry={dashboard.reload}
        isEmpty={!d}
        emptyText="Chưa có dữ liệu"
      >
        {d && (
          <>
            {/* Thẻ đầu trang */}
            <div className="td-hero">
              <small>
                {d.fullName ? `Xin chào, ${d.fullName}` : "Xin chào"}
              </small>
              <h1>
                {d.roomNumber ? `Phòng ${d.roomNumber}` : "Chưa có phòng"}
              </h1>
              <p>
                {d.roomNumber
                  ? d.buildingName
                  : "Bạn chưa có hợp đồng đang hiệu lực."}
              </p>
            </div>

            <div className="td-layout">
              <div className="td-col">
                {/* Cần thanh toán */}
                <section
                  className={`td-card td-due${overdue ? " is-overdue" : ""}`}
                >
                  <div className="td-card__head">
                    <h2>Cần thanh toán</h2>
                    {overdue && (
                      <span className="td-tag td-tag--red">Quá hạn</span>
                    )}
                  </div>

                  {hasDue ? (
                    <>
                      <div className="td-due__amount">
                        {formatMoney(d.amountDue)}
                      </div>
                      <div className="td-due__meta">
                        <span>{d.unpaidInvoiceCount} hóa đơn chưa đóng</span>
                        {d.dueDate && (
                          <span>Hạn gần nhất: {formatDate(d.dueDate)}</span>
                        )}
                      </div>
                      <Button
                        type="primary"
                        block
                        className="td-btn-primary"
                        icon={<ArrowRightOutlined />}
                        iconPosition="end"
                        onClick={() => goInvoice(d.latestInvoiceId)}
                      >
                        Xem hóa đơn
                      </Button>
                    </>
                  ) : (
                    <div className="td-clear">
                      <CheckCircleFilled />
                      <span>Bạn đã thanh toán đủ</span>
                    </div>
                  )}
                </section>

                {/* Hóa đơn gần đây */}
                <ListCard
                  className="td-invoices"
                  icon={<FileTextOutlined />}
                  title="Hóa đơn gần đây"
                  onAll={() => go(tenant_path_name.invoice)}
                  empty={invoices.length === 0 ? "Chưa có hóa đơn nào." : null}
                >
                  <div className="td-list">
                    {invoices.map((i) => {
                      const meta = metaOf(
                        INVOICE_STATUS,
                        i.overdue ? "OVERDUE" : i.status,
                      );

                      return (
                        <button
                          type="button"
                          className="td-item"
                          key={i.id}
                          style={{ "--acc": meta.c }}
                          onClick={() => goInvoice(i.id)}
                        >
                          <div className="td-item__main">
                            <b>
                              Hóa đơn tháng {i.billingMonth}/{i.billingYear}
                            </b>
                            <span>Hạn đóng: {formatDate(i.dueDate)}</span>
                          </div>
                          <div className="td-item__side">
                            <strong>
                              {formatMoney(
                                Number(i.remainingAmount) > 0
                                  ? i.remainingAmount
                                  : i.totalAmount,
                              )}
                            </strong>
                            <Chip meta={meta} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ListCard>

                {/* Nội quy */}
                <section className="td-card td-rules">
                  <div className="td-card__head">
                    <h2 className="td-card__title">
                      <span className="td-card__icon">
                        <SafetyCertificateOutlined />
                      </span>
                      Nội quy
                    </h2>
                    {HOUSE_RULES.length > RULES_PREVIEW && (
                      <button
                        type="button"
                        className="td-link"
                        onClick={() => setShowAllRules((value) => !value)}
                      >
                        {showAllRules ? "Thu gọn" : "Xem thêm"}
                      </button>
                    )}
                  </div>

                  <ol className="td-rules__list">
                    {(showAllRules
                      ? HOUSE_RULES
                      : HOUSE_RULES.slice(0, RULES_PREVIEW)
                    ).map((rule, index) => (
                      <li key={rule}>
                        <span className="td-rules__no">{index + 1}</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              <div className="td-col">
                {/* 3 ô nhanh */}
                <div className="td-tiles">
                  <button
                    type="button"
                    className="td-tile td-tile--issue"
                    onClick={() => go(tenant_path_name.issue)}
                  >
                    <span className="td-tile__icon">
                      <ToolOutlined />
                    </span>
                    <b className={d.openIssueCount > 0 ? "is-blue" : ""}>
                      {d.openIssueCount ?? 0}
                    </b>
                    <span className="td-tile__label">
                      Yêu cầu sửa chữa đang mở
                    </span>
                  </button>

                  <button
                    type="button"
                    className="td-tile td-tile--noti"
                    onClick={() => go(tenant_path_name.notification)}
                  >
                    <span className="td-tile__icon">
                      <BellOutlined />
                    </span>
                    <b
                      className={d.unreadNotificationCount > 0 ? "is-blue" : ""}
                    >
                      {d.unreadNotificationCount ?? 0}
                    </b>
                    <span className="td-tile__label">Thông báo chưa đọc</span>
                  </button>

                  <button
                    type="button"
                    className={`td-tile td-tile--contract${tone ? ` ${tone}` : ""}`}
                    onClick={() => go(tenant_path_name.contract)}
                  >
                    <span className="td-tile__icon">
                      <CalendarOutlined />
                    </span>
                    <b className={tone}>
                      {hasContract ? Math.max(daysLeft, 0) : "—"}
                    </b>
                    <span className="td-tile__label">
                      Ngày còn lại của hợp đồng
                    </span>
                  </button>
                </div>

                {/* Thông báo mới */}
                <ListCard
                  className="td-notis"
                  icon={<BellOutlined />}
                  badge={d.unreadNotificationCount}
                  title="Thông báo mới"
                  onAll={() => go(tenant_path_name.notification)}
                  empty={
                    notifications.length === 0 ? "Chưa có thông báo nào." : null
                  }
                >
                  <div className="td-list">
                    {notifications.map((n) => (
                      <button
                        type="button"
                        className={`td-item td-noti${n.isRead ? "" : " is-unread"}`}
                        key={n.id}
                        style={{ "--acc": n.isRead ? "#d5d9ee" : "#4a5be0" }}
                        onClick={() => go(tenant_path_name.notification)}
                      >
                        <div className="td-item__main">
                          <b>{n.title}</b>
                          <span>
                            {NOTI_TYPE[n.type] ?? "Thông báo"}
                            {n.sentAt &&
                              ` · ${dayjs(n.sentAt).format("DD/MM HH:mm")}`}
                          </span>
                        </div>
                        {!n.isRead && (
                          <span
                            className="td-noti__dot"
                            aria-label="Chưa đọc"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </ListCard>

                {/* Yêu cầu sửa chữa gần đây */}
                <ListCard
                  className="td-issues"
                  icon={<ToolOutlined />}
                  title="Sửa chữa gần đây"
                  onAll={() => go(tenant_path_name.issue)}
                  empty={issues.length === 0 ? "Chưa có yêu cầu nào." : null}
                >
                  <div className="td-list">
                    {issues.map((i) => {
                      const meta = metaOf(ISSUE_STATUS, i.status);

                      return (
                        <button
                          type="button"
                          className="td-item"
                          key={i.id}
                          style={{ "--acc": meta.c }}
                          onClick={() => go(tenant_path_name.issue)}
                        >
                          <div className="td-item__main">
                            <b>{i.title}</b>
                            <span>
                              {i.createdAt &&
                                dayjs(i.createdAt).format("DD/MM/YYYY")}
                            </span>
                          </div>
                          <div className="td-item__side">
                            <Chip meta={meta} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ListCard>
              </div>
            </div>
          </>
        )}
      </AsyncBlock>
    </div>
  );
}
