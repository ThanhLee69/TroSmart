import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Button,
  Col,
  Drawer,
  Flex,
  Input,
  Popconfirm,
  Row,
  Select,
  Tooltip,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  HomeOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { SiZalo } from "react-icons/si";
import dayjs from "dayjs";

import {
  getContacts,
  getContactById,
  getContactSummary,
  updateContact,
  deleteContact,
} from "../../../api/contactApi";

import MyCard from "../../../components/MyCard";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";
import CommonStatisticCards from "../../../components/CommonStatisticCards";
import { useNotify } from "../../../components/NotificationProvider";

import "./ContactPage.css";
import "../../../assets/style/FilterBar.css";

// =========================
// CẤU HÌNH HIỂN THỊ
// =========================

const STATUS_CONFIG = {
  NEW: { label: "Mới" },
  READ: { label: "Đã xem" },
  REPLIED: { label: "Đã phản hồi" },
};

// Nền + màu chữ của nhãn trạng thái
const STATUS_STYLES = {
  NEW: { bg: "#fff7e8", color: "#d97706" },
  READ: { bg: "#eaf2ff", color: "#1677ff" },
  REPLIED: { bg: "#eaf8ef", color: "#16a34a" },
};

// Nhu cầu của khách (khớp enum ContactTopic ở backend)
const TOPIC_CONFIG = {
  VIEW_ROOM: { label: "Xem phòng", color: "#2976e1" },
  PRICE_INQUIRY: { label: "Hỏi giá, thủ tục", color: "#722ed1" },
  TENANT_SUPPORT: { label: "Hỗ trợ khi đang thuê", color: "#13c2c2" },
  OTHER: { label: "Khác", color: "#8c8c8c" },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

const TOPIC_OPTIONS = Object.entries(TOPIC_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

// =========================
// COMPONENT HIỂN THỊ CHẤM MÀU
// =========================

const DotText = ({ label, color }) => {
  if (!label) return "—";

  return (
    <span className="cm-dot-text">
      <i className="cm-dot" style={{ "--dot-color": color || "#8c8c8c" }} />
      {label}
    </span>
  );
};

// Thẻ nhỏ có nền nhạt theo màu (dùng trong phần đầu Drawer)
const TagPill = ({ label, color, prefix }) => {
  if (!label) return null;

  return (
    <span className="cm-tag" style={{ "--tag-color": color || "#8c8c8c" }}>
      <i className="cm-dot" style={{ "--dot-color": color || "#8c8c8c" }} />
      {prefix && <em>{prefix}</em>}
      {label}
    </span>
  );
};

// Nhãn trạng thái: chấm màu + nền bo tròn
const StatusPill = ({ value }) => {
  const style = STATUS_STYLES[value] || { bg: "#f1f3f5", color: "#8c8c8c" };

  return (
    <span
      className="cm-dot-text cm-status"
      style={{ "--status-bg": style.bg, "--status-color": style.color }}
    >
      <i className="cm-dot" />
      {STATUS_CONFIG[value]?.label || value || "—"}
    </span>
  );
};

// =========================
// HÀM TIỆN ÍCH
// =========================

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY HH:mm") : "—";
};

// =========================
// TRANG QUẢN LÝ LIÊN HỆ
// =========================

const ContactPage = () => {
  const { notify, contextHolder } = useNotify();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // TÌM KIẾM VÀ LỌC
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState(undefined);
  const [topic, setTopic] = useState(undefined);

  // PHÂN TRANG
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  // DỮ LIỆU
  const [contacts, setContacts] = useState({
    items: [],
    totalItems: 0,
  });

  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // CHI TIẾT
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");

  // =========================
  // LẤY DANH SÁCH
  // =========================

  const fetchContacts = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getContacts({
        keyword,
        status,
        topic,
        page: pagination.page,
        size: pagination.size,
      });

      setContacts({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      console.error("Lấy danh sách liên hệ thất bại:", error);

      setContacts({
        items: [],
        totalItems: 0,
      });

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách liên hệ",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [keyword, status, topic, pagination.page, pagination.size]);

  // =========================
  // LẤY THỐNG KÊ
  // =========================

  const fetchSummary = useCallback(async () => {
    try {
      const data = await getContactSummary();
      setSummary(data ?? {});
    } catch (error) {
      console.error("Lấy thống kê liên hệ thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể tải thống kê liên hệ",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // =========================
  // TÌM KIẾM
  // =========================

  const handleSearch = (value) => {
    setKeyword(value);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // =========================
  // LỌC
  // =========================

  const handleFilterChange = (setter, value) => {
    setter(value);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // =========================
  // XÓA BỘ LỌC
  // =========================

  const handleClearFilters = () => {
    setKeyword("");
    setStatus(undefined);
    setTopic(undefined);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // =========================
  // PHÂN TRANG
  // =========================

  const handlePageChange = (page, size) => {
    setPagination({ page, size });
  };

  // =========================
  // MỞ CHI TIẾT
  // =========================

  const openDetail = async (record) => {
    try {
      setLoading(true);

      // Backend tự chuyển NEW thành READ khi mở lần đầu
      const data = await getContactById(record.id);

      setSelected(data);
      setNoteDraft(data?.adminNote || "");
      setDetailOpen(true);

      // Trạng thái vừa đổi nên tải lại danh sách và thống kê
      if (record.status === "NEW") {
        fetchContacts();
        fetchSummary();
      }
    } catch (error) {
      console.error("Lấy chi tiết liên hệ thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể xem chi tiết liên hệ",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ĐÓNG CHI TIẾT
  // =========================

  const closeDetail = () => {
    if (saving) return;

    setDetailOpen(false);
    setSelected(null);
    setNoteDraft("");
  };

  // =========================
  // LƯU TRẠNG THÁI / GHI CHÚ
  // =========================

  const saveContact = async (nextStatus, successMessage) => {
    if (!selected?.id) return;

    try {
      setSaving(true);

      const updated = await updateContact(selected.id, {
        status: nextStatus,
        adminNote: noteDraft.trim(),
      });

      notifyRef.current({
        type: "success",
        message: successMessage,
        description: `Liên hệ của ${selected.fullName}`,
      });

      setSelected(updated);
      setNoteDraft(updated?.adminNote || "");

      fetchContacts();
      fetchSummary();
    } catch (error) {
      console.error("Cập nhật liên hệ thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Cập nhật liên hệ thất bại",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // XÓA LIÊN HỆ
  // =========================

  const handleDelete = async () => {
    if (!selected?.id) return;

    try {
      setSaving(true);

      await deleteContact(selected.id);

      notifyRef.current({
        type: "success",
        message: "Đã xóa liên hệ",
        description: `Liên hệ của ${selected.fullName}`,
      });

      setDetailOpen(false);
      setSelected(null);
      setNoteDraft("");

      // Xóa dòng cuối của trang thì lùi về trang trước
      if (contacts.items.length === 1 && pagination.page > 1) {
        setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        fetchContacts();
      }

      fetchSummary();
    } catch (error) {
      console.error("Xóa liên hệ thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Xóa liên hệ thất bại",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSaving(false);
    }
  };

  const noteChanged = (noteDraft || "").trim() !== (selected?.adminNote || "");

  // =========================
  // THẺ THỐNG KÊ
  // =========================

  const statisticCards = [
    {
      key: "total",
      title: "Tổng liên hệ",
      value: summary.total ?? 0,
      description: "Tổng số liên hệ khách đã gửi",
      icon: <MessageOutlined />,
      color: "#536ee7",
      background: "#eef1ff",
    },
    {
      key: "new",
      title: "Mới",
      value: summary.newCount ?? 0,
      description: "Liên hệ chưa ai xem",
      icon: <ClockCircleOutlined />,
      color: "#d97706",
      background: "#fff7e8",
    },
    {
      key: "read",
      title: "Đã xem",
      value: summary.readCount ?? 0,
      description: "Đã xem, chưa phản hồi",
      icon: <EyeOutlined />,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      key: "replied",
      title: "Đã phản hồi",
      value: summary.repliedCount ?? 0,
      description: "Đã liên hệ lại với khách",
      icon: <CheckCircleOutlined />,
      color: "#16a34a",
      background: "#eaf8ef",
    },
  ];

  // =========================
  // CỘT BẢNG
  // =========================

  const columns = [
    {
      title: "Khách",
      dataIndex: "fullName",
      key: "fullName",
      width: 190,
      render: (value, record) => (
        <div className="cm-room-info">
          <span className="cm-room-number">{value || "—"}</span>
          <span className="cm-building-name">{record.phone || "—"}</span>
        </div>
      ),
    },
    {
      title: "Nhu cầu",
      dataIndex: "topic",
      key: "topic",
      width: 190,
      render: (value) => (
        <DotText
          label={TOPIC_CONFIG[value]?.label || value || "—"}
          color={TOPIC_CONFIG[value]?.color}
        />
      ),
    },
    {
      title: "Phòng quan tâm",
      dataIndex: "roomNumber",
      key: "roomNumber",
      width: 160,
      render: (value, record) =>
        value ? (
          <div className="cm-room-info">
            <span className="cm-room-number">{value}</span>
            <span className="cm-building-name">
              {record.buildingName || "—"}
            </span>
          </div>
        ) : (
          <span className="cm-muted">Liên hệ chung</span>
        ),
    },
    {
      title: "Nội dung",
      dataIndex: "message",
      key: "message",
      width: 290,
      render: (value) =>
        value ? (
          <Tooltip title={value} placement="topLeft">
            <span className="cm-preview">{value}</span>
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      title: "Ngày gửi",
      dataIndex: "sentAt",
      key: "sentAt",
      width: 160,
      render: formatDateTime,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value) => <StatusPill value={value} />,
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right",
      width: 76,
      align: "center",
      render: (_, record) => (
        <Tooltip title="Xem chi tiết">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => openDetail(record)}
            aria-label={`Xem liên hệ của ${record.fullName || ""}`}
          />
        </Tooltip>
      ),
    },
  ];

  // =========================
  // RENDER
  // =========================

  return (
    <Fragment>
      {contextHolder}

      <PageHeader
        title="Quản lý liên hệ"
        description="Xem yêu cầu liên hệ từ khách, ghi chú và đánh dấu đã phản hồi."
      />

      <Flex vertical gap={20}>
        {/* TÌM KIẾM VÀ LỌC */}
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            <Col xs={24} xl={14}>
              <Input
                allowClear
                placeholder="Tìm theo tên, số điện thoại hoặc email..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                value={keyword}
                onChange={(event) => handleSearch(event.target.value)}
              />
            </Col>

            <Col xs={24} sm={12} xl={4}>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder="Trạng thái"
                value={status}
                options={STATUS_OPTIONS}
                onChange={(value) => handleFilterChange(setStatus, value)}
              />
            </Col>

            <Col xs={24} sm={12} xl={4}>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder="Nhu cầu"
                value={topic}
                options={TOPIC_OPTIONS}
                onChange={(value) => handleFilterChange(setTopic, value)}
              />
            </Col>

            <Col xs={24} sm={12} xl={2}>
              <Button
                block
                className="app-filter__clear"
                onClick={handleClearFilters}
              >
                Xóa lọc
              </Button>
            </Col>
          </Row>
        </MyCard>

        {/* THỐNG KÊ */}
        <CommonStatisticCards items={statisticCards} />

        {/* DANH SÁCH */}
        <MyCard title="Danh sách liên hệ">
          <CommonTable
            columns={columns}
            dataSource={contacts.items}
            rowKey="id"
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: contacts.totalItems,
            }}
            onPageChange={handlePageChange}
            emptyText="Chưa có liên hệ nào"
            totalText="liên hệ"
          />
        </MyCard>
      </Flex>

      {/* DRAWER CHI TIẾT */}
      <Drawer
        title="Chi tiết liên hệ"
        open={detailOpen}
        onClose={closeDetail}
        width={520}
        rootClassName="cm-drawer"
        destroyOnHidden
        maskClosable={!saving}
        keyboard={!saving}
        closable={!saving}
        footer={
          selected && (
            <div className="cm-footer">
              <Popconfirm
                title="Xóa liên hệ này?"
                description="Liên hệ sẽ bị xóa vĩnh viễn và không thể hoàn tác."
                okText="Xóa"
                okButtonProps={{ danger: true }}
                cancelText="Không"
                placement="topLeft"
                onConfirm={handleDelete}
                disabled={saving}
              >
                <Button
                  danger
                  className="cm-btn cm-btn--cancel"
                  icon={<DeleteOutlined />}
                  disabled={saving}
                >
                  Xóa
                </Button>
              </Popconfirm>

              <div className="cm-footer__main">
                <Button
                  className="cm-btn cm-btn--close"
                  disabled={saving || !noteChanged}
                  onClick={() => saveContact(selected.status, "Đã lưu ghi chú")}
                >
                  Lưu ghi chú
                </Button>

                {selected.status === "REPLIED" ? (
                  <Button
                    className="cm-btn cm-btn--close"
                    disabled={saving}
                    onClick={() =>
                      saveContact("READ", "Đã chuyển về chưa phản hồi")
                    }
                  >
                    Mở lại
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    className="cm-btn cm-btn--primary"
                    loading={saving}
                    icon={<CheckCircleOutlined />}
                    onClick={() =>
                      saveContact("REPLIED", "Đã đánh dấu đã phản hồi")
                    }
                  >
                    Đã phản hồi
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {selected && (
          <div className="cm-detail">
            {/* TIÊU ĐỀ */}
            <section
              className="cm-detail__hero"
              style={{
                "--hero-bg": STATUS_STYLES[selected.status]?.bg,
                "--hero-color": STATUS_STYLES[selected.status]?.color,
              }}
            >
              <div className="cm-detail__hero-top">
                <StatusPill value={selected.status} />
                <span className="cm-detail__id">Mã #{selected.id}</span>
              </div>

              <h3 className="cm-detail__title">{selected.fullName || "—"}</h3>

              <div className="cm-detail__tags">
                <TagPill
                  prefix="Nhu cầu"
                  label={TOPIC_CONFIG[selected.topic]?.label || selected.topic}
                  color={TOPIC_CONFIG[selected.topic]?.color}
                />
              </div>
            </section>

            {/* GỌI NHANH */}
            <section className="cm-quick">
              <a className="cm-quick__btn" href={`tel:${selected.phone}`}>
                <PhoneOutlined />
                Gọi {selected.phone}
              </a>

              <a
                className="cm-quick__btn"
                href={`https://zalo.me/${selected.phone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SiZalo />
                Nhắn Zalo
              </a>
            </section>

            {/* THÔNG TIN */}
            <section className="cm-detail__grid">
              <div className="cm-info">
                <PhoneOutlined />
                <div>
                  <span>Số điện thoại</span>
                  <b>{selected.phone || "—"}</b>
                </div>
              </div>

              <div className="cm-info">
                <MailOutlined />
                <div>
                  <span>Email</span>
                  {selected.email ? (
                    <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  ) : (
                    <b>—</b>
                  )}
                </div>
              </div>

              <div className="cm-info">
                <HomeOutlined />
                <div>
                  <span>Phòng quan tâm</span>
                  {selected.roomNumber ? (
                    <>
                      <b>{selected.roomNumber}</b>
                      <small>{selected.buildingName || "—"}</small>
                    </>
                  ) : (
                    <b>Liên hệ chung</b>
                  )}
                </div>
              </div>

              <div className="cm-info">
                <CalendarOutlined />
                <div>
                  <span>Ngày gửi</span>
                  <b>{formatDateTime(selected.sentAt)}</b>
                </div>
              </div>
            </section>

            {/* NỘI DUNG */}
            <section className="cm-detail__block">
              <h4>Nội dung khách gửi</h4>
              <p>{selected.message || "—"}</p>
            </section>

            {/* GHI CHÚ NỘI BỘ */}
            <section className="cm-detail__block">
              <h4>Ghi chú nội bộ</h4>

              <Input.TextArea
                className="cm-note"
                rows={3}
                maxLength={500}
                showCount
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Ví dụ: Đã gọi lúc 15h, hẹn xem phòng thứ 7..."
                disabled={saving}
              />
            </section>
          </div>
        )}
      </Drawer>
    </Fragment>
  );
};

export default ContactPage;
