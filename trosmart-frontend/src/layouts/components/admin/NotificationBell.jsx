import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Dropdown, Empty, Spin } from "antd";
import { BellOutlined, CheckOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { path_name, tenant_path_name } from "../../../constants/path_name";
import { ROLES } from "../../../context/PermissionContext";
import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../../../api/myTenantApi";
import {
  getContactById,
  getContactSummary,
  getContacts,
} from "../../../api/contactApi";
import { getIssues } from "../../../api/issueApi";

/* =====================================================================
   Admin  : dùng API thật, chỉ có 2 loại việc cần xử lý
            - Liên hệ mới (status NEW):       contactApi: getContactSummary, getContacts
            - Yêu cầu sửa chữa mới (PENDING): issueApi: getIssues({ status, page, size })
   Khách  : dùng API thật (GET /tenant/notifications, /unread-count, PATCH read, read-all)
            [{ id, title, content, time, read }]      (5 thông báo mới nhất)
   ===================================================================== */

const TOPIC_LABELS = {
  VIEW_ROOM: "Xem phòng",
  PRICE_INQUIRY: "Hỏi giá và thủ tục thuê",
  TENANT_SUPPORT: "Hỗ trợ khi đang thuê",
  OTHER: "Khác",
};

// Đường dẫn trang quản lý của admin (thêm contact vào path_name nếu chưa có)
const ADMIN_CONTACT_PATH = path_name.contact;
const ADMIN_ISSUE_PATH = path_name.issue;

// Yêu cầu sửa chữa đã bấm xem: nhớ trong trình duyệt để không đếm lại (trạng thái vẫn PENDING)
const SEEN_ISSUES_KEY = "trosmart.bell.seenIssues";

const readSeenIssues = () => {
  try {
    const value = JSON.parse(localStorage.getItem(SEEN_ISSUES_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeSeenIssues = (ids) => {
  try {
    localStorage.setItem(SEEN_ISSUES_KEY, JSON.stringify(ids));
  } catch {
    /* bỏ qua nếu trình duyệt chặn lưu trữ */
  }
};

const EMPTY_ADMIN = {
  contactCount: 0,
  contacts: [],
  issueCount: 0,
  issues: [],
};

// Bỏ các yêu cầu đã xem, lấy 5 yêu cầu chưa xem mới nhất
function buildIssueBell(result) {
  if (result.status !== "fulfilled") return { issueCount: 0, issues: [] };

  const all = result.value?.items ?? [];
  const total = Number(result.value?.totalItems) || all.length;
  const seen = new Set(readSeenIssues());
  const unseen = all.filter((i) => !seen.has(i.id));

  // Đã lấy đủ danh sách thì dọn các id không còn chờ xử lý
  if (all.length >= total) {
    writeSeenIssues(
      readSeenIssues().filter((id) => all.some((i) => i.id === id)),
    );
  }

  return {
    issueCount: total - (all.length - unseen.length),
    issues: unseen.slice(0, 5).map((i) => ({
      id: i.id,
      title: i.title ?? i.description ?? "Yêu cầu sửa chữa",
      content: i.description && i.title ? i.description : "",
      room: [i.buildingName, i.roomNumber].filter(Boolean).join(" · "),
      time: formatTime(i.createdAt),
    })),
  };
}

// 5 liên hệ mới + 5 yêu cầu sửa chữa mới; một bên lỗi thì bên kia vẫn hiện
async function getAdminBell() {
  const [summary, contacts, issues] = await Promise.allSettled([
    getContactSummary(),
    getContacts({ status: "NEW", page: 1, size: 5 }),
    getIssues({ status: "PENDING", page: 1, size: 20 }),
  ]);

  const contactItems =
    contacts.status === "fulfilled" ? (contacts.value?.items ?? []) : [];
  const issueItems =
    issues.status === "fulfilled" ? (issues.value?.items ?? []) : [];

  return {
    contactCount:
      summary.status === "fulfilled"
        ? Number(summary.value?.newCount) || 0
        : contactItems.length,
    contacts: contactItems.map((c) => ({
      id: c.id,
      title: c.fullName,
      topic: TOPIC_LABELS[c.topic] ?? "Liên hệ",
      content: c.message,
      room: c.roomNumber
        ? `${c.buildingName ?? ""} ${c.roomNumber}`.trim()
        : "",
      time: formatTime(c.sentAt),
    })),
    ...buildIssueBell(issues),
  };
}

// "Hôm nay, 08:30" / "Hôm qua" / "03/11/2026"
function formatTime(value) {
  if (!value) return "";
  const date = dayjs(value);
  if (!date.isValid()) return "";

  const today = dayjs().startOf("day");
  if (date.isSame(today, "day")) return `Hôm nay, ${date.format("HH:mm")}`;
  if (date.isSame(today.subtract(1, "day"), "day")) return "Hôm qua";
  return date.format("DD/MM/YYYY");
}

// 5 thông báo mới nhất + số chưa đọc (số này tính trên toàn bộ, không chỉ 5 cái)
async function getTenantBell() {
  const [page, unread] = await Promise.all([
    getMyNotifications({ page: 1, size: 5 }),
    getMyUnreadNotificationCount(),
  ]);

  const items = (page?.items ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    time: formatTime(n.sentAt),
    read: Boolean(n.isRead),
  }));

  return { items, unread: Number(unread) || 0 };
}

const REFRESH_MS = 60 * 1000;

const NotificationBell = ({ role, mobile }) => {
  const navigate = useNavigate();
  const isTenant = role === ROLES.TENANT;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [admin, setAdmin] = useState(EMPTY_ADMIN);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isTenant) {
        const data = await getTenantBell();
        setItems(data.items);
        setUnread(data.unread);
      } else {
        setAdmin(await getAdminBell());
      }
    } catch {
      setItems([]);
      setUnread(0);
      setAdmin(EMPTY_ADMIN);
    } finally {
      setLoading(false);
    }
  }, [isTenant]);

  // Tải lúc đầu, mỗi phút một lần, và mỗi khi mở chuông
  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const badgeCount = useMemo(
    () => (isTenant ? unread : admin.contactCount + admin.issueCount),
    [admin, unread, isTenant],
  );

  const go = (path) => {
    if (!path) return;
    setOpen(false);
    navigate(path);
  };

  // Admin bấm xem một mục: trừ số ngay, không chờ lần tải lại sau
  const openAdminItem = (kind, id, path) => {
    if (kind === "contact") {
      setAdmin((prev) => ({
        ...prev,
        contactCount: Math.max(0, prev.contactCount - 1),
        contacts: prev.contacts.filter((n) => n.id !== id),
      }));
      // Mở chi tiết thì backend tự chuyển NEW thành READ
      getContactById(id).catch(() => load());
    } else {
      writeSeenIssues([...new Set([...readSeenIssues(), id])]);
      setAdmin((prev) => ({
        ...prev,
        issueCount: Math.max(0, prev.issueCount - 1),
        issues: prev.issues.filter((n) => n.id !== id),
      }));
    }

    go(path);
  };

  // Đánh dấu đã đọc: cập nhật giao diện ngay, gọi API ở nền, lỗi thì tải lại cho đúng số
  const markRead = async (id) => {
    const target = items.find((n) => n.id === id);
    if (!target || target.read) return;

    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnread((value) => Math.max(0, value - 1));

    try {
      await markMyNotificationRead(id);
    } catch {
      load();
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);

    try {
      await markAllMyNotificationsRead();
    } catch {
      load();
    }
  };

  const header = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px 10px",
      }}
    >
      <strong style={{ fontSize: 15 }}>
        {isTenant ? "Thông báo" : "Việc cần xử lý"}
      </strong>
      {isTenant && badgeCount > 0 && (
        <Button
          type="link"
          size="small"
          icon={<CheckOutlined />}
          onClick={markAllRead}
        >
          Đọc tất cả
        </Button>
      )}
    </div>
  );

  const rowStyle = {
    display: "flex",
    width: "100%",
    gap: 10,
    padding: "10px 16px",
    border: 0,
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    font: "inherit",
  };

  const body =
    loading && items.length === 0 ? (
      <div style={{ padding: 32, textAlign: "center" }}>
        <Spin />
      </div>
    ) : isTenant ? (
      items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có thông báo"
        />
      ) : (
        items.map((n) => (
          <button
            key={n.id}
            type="button"
            className="bell-row"
            style={rowStyle}
            onClick={() => {
              markRead(n.id);
              go(tenant_path_name.notification);
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: "0 0 8px",
                height: 8,
                marginTop: 6,
                borderRadius: "50%",
                background: n.read ? "transparent" : "#4a5be0",
              }}
            />
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  fontWeight: n.read ? 400 : 600,
                  color: "#151b3b",
                }}
              >
                {n.title}
              </span>
              <span
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  fontSize: 13,
                  color: "#5b6385",
                }}
              >
                {n.content}
              </span>
              <span style={{ fontSize: 12, color: "#7a82a6" }}>{n.time}</span>
            </span>
          </button>
        ))
      )
    ) : admin.contactCount + admin.issueCount === 0 ? (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Không có việc cần xử lý"
      />
    ) : (
      <>
        {[
          {
            key: "contact",
            label: "Liên hệ mới",
            count: admin.contactCount,
            items: admin.contacts,
            path: ADMIN_CONTACT_PATH,
          },
          {
            key: "issue",
            label: "Yêu cầu sửa chữa mới",
            count: admin.issueCount,
            items: admin.issues,
            path: ADMIN_ISSUE_PATH,
          },
        ]
          .filter((group) => group.count > 0)
          .map((group) => (
            <div key={group.key}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px 4px",
                  color: "#8a93ad",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                <span>
                  {group.label}
                  <span
                    style={{
                      marginLeft: 8,
                      padding: "1px 8px",
                      borderRadius: 999,
                      background: group.key === "issue" ? "#fff1f0" : "#eef0fd",
                      color: group.key === "issue" ? "#cf1322" : "#3b4bcb",
                    }}
                  >
                    {group.count}
                  </span>
                </span>
                <Button type="link" size="small" onClick={() => go(group.path)}>
                  Xem tất cả
                </Button>
              </div>

              {group.items.map((n) => (
                <button
                  key={`${group.key}-${n.id}`}
                  type="button"
                  className="bell-row"
                  style={rowStyle}
                  onClick={() => openAdminItem(group.key, n.id, group.path)}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "0 0 8px",
                      height: 8,
                      marginTop: 6,
                      borderRadius: "50%",
                      background: group.key === "issue" ? "#e5484d" : "#4a5be0",
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontWeight: 600,
                        color: "#151b3b",
                      }}
                    >
                      {n.title}
                      {n.topic && (
                        <span
                          style={{
                            marginLeft: 8,
                            color: "#5b6385",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {n.topic}
                        </span>
                      )}
                    </span>
                    {n.content && (
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          fontSize: 13,
                          color: "#5b6385",
                        }}
                      >
                        {n.content}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: "#7a82a6" }}>
                      {[n.room, n.time].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
      </>
    );

  const footer = isTenant && (
    <div style={{ padding: "6px 16px 12px", textAlign: "center" }}>
      <Button type="link" onClick={() => go(tenant_path_name.notification)}>
        Xem tất cả thông báo
      </Button>
    </div>
  );

  const panel = (
    <div
      style={{
        width: mobile ? "min(340px, calc(100vw - 24px))" : 360,
        maxHeight: "70vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 12px 32px -8px rgba(21, 27, 59, 0.25)",
      }}
    >
      <style>{`.bell-row:hover{background:#f4f5fd !important}`}</style>
      {header}
      {body}
      {footer}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      dropdownRender={() => panel}
    >
      <Badge
        count={badgeCount}
        size="small"
        overflowCount={99}
        offset={[-4, 6]}
      >
        <Button
          type="text"
          aria-label={`Thông báo${badgeCount ? `, ${badgeCount} mục mới` : ""}`}
          icon={<BellOutlined style={{ fontSize: 20 }} />}
          style={{
            width: 40,
            height: 40,
            border: "1px solid #e3e6f2",
            borderRadius: 12,
            background: "#fff",
            color: "#3a4268",
          }}
        />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;
