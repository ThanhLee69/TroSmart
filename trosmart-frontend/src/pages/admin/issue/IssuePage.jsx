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
  Typography,
  Tooltip,
} from "antd";

import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  HomeOutlined,
  PlayCircleOutlined,
  SearchOutlined,
  UserOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getIssues,
  getIssueById,
  updateIssueStatus,
  getIssueDashboard,
  cancelIssue,
} from "../../../api/issueApi";

import MyCard from "../../../components/MyCard";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";
import CommonStatisticCards from "../../../components/CommonStatisticCards";
import { useNotify } from "../../../components/NotificationProvider";

import "./IssuePage.css";
import "../../../assets/style/FilterBar.css";
const { Text } = Typography;

// =========================
// CẤU HÌNH HIỂN THỊ
// =========================

const STATUS_CONFIG = {
  PENDING: { label: "Chờ tiếp nhận" },
  ACCEPTED: { label: "Đã tiếp nhận" },
  IN_PROGRESS: { label: "Đang xử lý" },
  COMPLETED: { label: "Đã hoàn thành" },
  CANCELLED: { label: "Đã hủy" },
};

const PRIORITY_CONFIG = {
  LOW: { label: "Thấp" },
  MEDIUM: { label: "Trung bình" },
  HIGH: { label: "Cao" },
  URGENT: { label: "Khẩn cấp" },
};

const CATEGORY_LABELS = {
  ELECTRICITY: "Điện",
  WATER: "Nước",
  EQUIPMENT: "Thiết bị",
  FURNITURE: "Nội thất",
  DOOR_LOCK: "Cửa / Khóa",
  OTHER: "Khác",
};

// Màu chấm theo loại sự cố
const CATEGORY_COLORS = {
  ELECTRICITY: "#faad14",
  WATER: "#2976e1",
  EQUIPMENT: "#722ed1",
  FURNITURE: "#13c2c2",
  DOOR_LOCK: "#eb2f96",
  OTHER: "#8c8c8c",
};

// Màu chấm theo mức độ
const PRIORITY_COLORS = {
  LOW: "#8c8c8c",
  MEDIUM: "#2976e1",
  HIGH: "#fa8c16",
  URGENT: "#f5222d",
};

// Màu chấm theo trạng thái
const STATUS_COLORS = {
  PENDING: "#faad14",
  ACCEPTED: "#1677ff",
  IN_PROGRESS: "#722ed1",
  COMPLETED: "#52c41a",
  CANCELLED: "#e81111",
};

// Nền + màu chữ của nhãn trạng thái
const STATUS_STYLES = {
  PENDING: { bg: "#fff7e8", color: "#d97706" },
  ACCEPTED: { bg: "#eaf2ff", color: "#1677ff" },
  IN_PROGRESS: { bg: "#f3e8ff", color: "#722ed1" },
  COMPLETED: { bg: "#eaf8ef", color: "#16a34a" },
  CANCELLED: { bg: "#f7edec", color: "#ed1c1c" },
};

// Các mốc của tiến trình xử lý (theo thứ tự)
const FLOW = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];

const STEP_DESCRIPTIONS = {
  PENDING: "Khách thuê đã gửi yêu cầu",
  ACCEPTED: "Chủ trọ đã nhận yêu cầu",
  IN_PROGRESS: "Đang tiến hành sửa chữa",
  COMPLETED: "Sự cố đã được xử lý xong",
  CANCELLED: "Yêu cầu đã bị hủy",
};

// Bước tiếp theo mà chủ trọ có thể bấm xác nhận
const NEXT_ACTIONS = {
  PENDING: {
    next: "ACCEPTED",
    label: "Tiếp nhận",
    icon: <CheckOutlined />,
    confirm: "Xác nhận tiếp nhận yêu cầu này?",
    success: "Đã tiếp nhận yêu cầu",
  },
  ACCEPTED: {
    next: "IN_PROGRESS",
    label: "Bắt đầu xử lý",
    icon: <PlayCircleOutlined />,
    confirm: "Xác nhận bắt đầu xử lý sự cố?",
    success: "Đã chuyển sang đang xử lý",
  },
  IN_PROGRESS: {
    next: "COMPLETED",
    label: "Hoàn thành",
    icon: <CheckCircleOutlined />,
    confirm: "Xác nhận sự cố đã được xử lý xong?",
    success: "Đã hoàn thành yêu cầu",
  },
};

// Chỉ được hủy khi chưa bắt đầu xử lý
const CANCELLABLE = ["PENDING", "ACCEPTED"];

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG).map(
  ([value, config]) => ({
    value,
    label: config.label,
  }),
);

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

// =========================
// COMPONENT HIỂN THỊ CHẤM MÀU
// =========================

const DotText = ({ label, color, className = "" }) => {
  if (!label) return "—";

  return (
    <span className={`issue-dot-text ${className}`}>
      <i className="issue-dot" style={{ "--dot-color": color || "#8c8c8c" }} />
      {label}
    </span>
  );
};

// Thẻ nhỏ có nền nhạt theo màu (dùng trong phần đầu Drawer)
const TagPill = ({ label, color, prefix }) => {
  if (!label) return null;

  return (
    <span className="issue-tag" style={{ "--tag-color": color || "#8c8c8c" }}>
      <i className="issue-dot" style={{ "--dot-color": color || "#8c8c8c" }} />
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
      className="issue-dot-text issue-status"
      style={{ "--status-bg": style.bg, "--status-color": style.color }}
    >
      <i className="issue-dot" />
      {STATUS_CONFIG[value]?.label || value || "—"}
    </span>
  );
};

// Dựng các mốc timeline từ trạng thái hiện tại
const buildSteps = (issue) => {
  const { status, createdAt, updatedAt } = issue;

  if (status === "CANCELLED") {
    return [
      { key: "PENDING", state: "done", time: createdAt },
      { key: "CANCELLED", state: "cancelled", time: updatedAt },
    ];
  }

  const current = FLOW.indexOf(status);

  return FLOW.map((key, index) => {
    let state = "todo";
    if (index < current) state = "done";
    if (index === current) state = status === "COMPLETED" ? "done" : "current";

    // Backend mới lưu ngày tạo và ngày cập nhật cuối nên chỉ gắn giờ cho 2 mốc này
    let time = null;
    if (index === 0) time = createdAt;
    else if (index === current) time = updatedAt;

    return { key, state, time };
  });
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
// TRANG QUẢN LÝ SỰ CỐ
// =========================

const IssuePage = () => {
  const { notify, contextHolder } = useNotify();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // TÌM KIẾM VÀ LỌC
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState(undefined);
  const [category, setCategory] = useState(undefined);
  const [priority, setPriority] = useState(undefined);

  // PHÂN TRANG
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  // DỮ LIỆU
  const [issues, setIssues] = useState({
    items: [],
    totalItems: 0,
  });

  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // CHI TIẾT
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // =========================
  // LẤY DANH SÁCH
  // =========================

  const fetchIssues = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getIssues({
        keyword,
        status,
        category,
        priority,
        page: pagination.page,
        size: pagination.size,
      });

      setIssues({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      console.error("Lấy danh sách yêu cầu thất bại:", error);

      setIssues({
        items: [],
        totalItems: 0,
      });

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách yêu cầu",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [keyword, status, category, priority, pagination.page, pagination.size]);

  // =========================
  // LẤY THỐNG KÊ
  // =========================

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await getIssueDashboard();
      setDashboard(data ?? {});
    } catch (error) {
      console.error("Lấy thống kê yêu cầu thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể tải thống kê yêu cầu",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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
    setCategory(undefined);
    setPriority(undefined);

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

  const openDetail = async (id) => {
    try {
      setLoading(true);

      const data = await getIssueById(id);

      setSelectedIssue(data);
      setDetailOpen(true);
    } catch (error) {
      console.error("Lấy chi tiết yêu cầu thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể xem chi tiết yêu cầu",
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
    setSelectedIssue(null);
  };

  // =========================
  // CHUYỂN TRẠNG THÁI / HỦY
  // =========================

  // Chạy một thao tác rồi tải lại danh sách, thống kê và chi tiết đang mở
  const runAction = async (action, successMessage, errorMessage) => {
    if (!selectedIssue?.id) return;

    try {
      setSaving(true);

      await action(selectedIssue.id);

      notifyRef.current({
        type: "success",
        message: successMessage,
        description: `Yêu cầu "${selectedIssue.title}"`,
      });

      const [updated] = await Promise.all([
        getIssueById(selectedIssue.id),
        fetchIssues(),
        fetchDashboard(),
      ]);

      setSelectedIssue(updated);
    } catch (error) {
      console.error(errorMessage, error);

      notifyRef.current({
        type: "error",
        message: errorMessage,
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra trạng thái và thử lại.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = () => {
    const action = NEXT_ACTIONS[selectedIssue?.status];
    if (!action) return;

    runAction(
      (id) => updateIssueStatus(id, action.next),
      action.success,
      "Cập nhật trạng thái thất bại",
    );
  };

  const handleCancel = () =>
    runAction(
      (id) => cancelIssue(id),
      "Đã hủy yêu cầu",
      "Hủy yêu cầu thất bại",
    );

  // =========================
  // THẺ THỐNG KÊ
  // =========================

  const statisticCards = [
    {
      key: "total",
      title: "Tổng yêu cầu",
      value: dashboard.totalIssues ?? 0,
      description: "Tổng số yêu cầu sửa chữa",
      icon: <ExclamationCircleOutlined />,
      color: "#536ee7",
      background: "#eef1ff",
    },
    {
      key: "pending",
      title: "Chờ xử lý",
      value: dashboard.pendingIssues ?? 0,
      description: "Yêu cầu đang chờ tiếp nhận",
      icon: <ClockCircleOutlined />,
      color: "#d97706",
      background: "#fff7e8",
    },
    {
      key: "processing",
      title: "Đang xử lý",
      value: dashboard.inProgressIssues ?? 0,
      description: "Yêu cầu đang được xử lý",
      icon: <ToolOutlined />,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      key: "completed",
      title: "Đã hoàn thành",
      value: dashboard.completedIssues ?? 0,
      description: "Yêu cầu đã xử lý xong",
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
      title: "Tiêu đề sự cố",
      dataIndex: "title",
      key: "title",
      width: 250,
      render: (value) => <Text strong>{value || "—"}</Text>,
    },
    {
      title: "Phòng",
      dataIndex: "roomNumber",
      key: "roomNumber",
      width: 150,
      render: (value, record) => (
        <div className="issue-room-info">
          <span className="issue-room-number">{value || "—"}</span>
          <span className="issue-building-name">
            {record.buildingName || "—"}
          </span>
        </div>
      ),
    },
    {
      title: "Người báo",
      dataIndex: "tenantName",
      key: "tenantName",
      width: 150,
      render: (value) => value || "—",
    },
    {
      title: "Loại sự cố",
      dataIndex: "category",
      key: "category",
      width: 120,
      render: (value) => (
        <DotText
          label={CATEGORY_LABELS[value] || value || "—"}
          color={CATEGORY_COLORS[value]}
        />
      ),
    },
    {
      title: "Mức độ",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (value) => (
        <DotText
          label={PRIORITY_CONFIG[value]?.label || value || "—"}
          color={PRIORITY_COLORS[value]}
        />
      ),
    },
    {
      title: "Ngày báo",
      dataIndex: "createdAt",
      key: "createdAt",
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
            onClick={() => openDetail(record.id)}
            aria-label={`Xem chi tiết sự cố ${record.title || ""}`}
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
        title="Quản lý sự cố"
        description="Theo dõi yêu cầu sửa chữa và cập nhật trạng thái xử lý."
      />

      <Flex vertical gap={20}>
        {/* TÌM KIẾM VÀ LỌC */}
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            <Col xs={24} xl={10}>
              <Input
                allowClear
                placeholder="Tìm theo tiêu đề, khách thuê hoặc mã phòng..."
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
                placeholder="Loại sự cố"
                value={category}
                options={CATEGORY_OPTIONS}
                onChange={(value) => handleFilterChange(setCategory, value)}
              />
            </Col>

            <Col xs={24} sm={12} xl={4}>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder="Mức độ ưu tiên"
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={(value) => handleFilterChange(setPriority, value)}
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
        <MyCard title="Danh sách yêu cầu sửa chữa">
          <CommonTable
            columns={columns}
            dataSource={issues.items}
            rowKey="id"
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: issues.totalItems,
            }}
            onPageChange={handlePageChange}
            emptyText="Chưa có yêu cầu sửa chữa"
            totalText="yêu cầu"
          />
        </MyCard>
      </Flex>

      {/* DRAWER CHI TIẾT */}
      <Drawer
        title="Chi tiết yêu cầu sửa chữa"
        open={detailOpen}
        onClose={closeDetail}
        width={520}
        rootClassName="issue-drawer"
        destroyOnHidden
        maskClosable={!saving}
        keyboard={!saving}
        closable={!saving}
        footer={
          selectedIssue && (
            <div className="issue-footer">
              {CANCELLABLE.includes(selectedIssue.status) ? (
                <Popconfirm
                  title="Hủy yêu cầu sửa chữa?"
                  description="Yêu cầu sẽ chuyển sang đã hủy và không thể hoàn tác."
                  okText="Hủy yêu cầu"
                  okButtonProps={{ danger: true }}
                  cancelText="Không"
                  placement="topLeft"
                  onConfirm={handleCancel}
                  disabled={saving}
                >
                  <Button
                    danger
                    className="issue-btn issue-btn--cancel"
                    icon={<CloseCircleOutlined />}
                    disabled={saving}
                  >
                    Hủy yêu cầu
                  </Button>
                </Popconfirm>
              ) : (
                <span />
              )}

              <div className="issue-footer__main">
                {NEXT_ACTIONS[selectedIssue.status] && (
                  <Popconfirm
                    title={NEXT_ACTIONS[selectedIssue.status].confirm}
                    okText="Xác nhận"
                    cancelText="Không"
                    placement="topRight"
                    onConfirm={handleAdvance}
                    disabled={saving}
                  >
                    <Button
                      type="primary"
                      className="issue-btn issue-btn--primary"
                      loading={saving}
                      icon={NEXT_ACTIONS[selectedIssue.status].icon}
                    >
                      {NEXT_ACTIONS[selectedIssue.status].label}
                    </Button>
                  </Popconfirm>
                )}
              </div>
            </div>
          )
        }
      >
        {selectedIssue && (
          <div className="issue-detail">
            {/* TIÊU ĐỀ */}
            <section
              className="issue-detail__hero"
              style={{
                "--hero-bg": STATUS_STYLES[selectedIssue.status]?.bg,
                "--hero-color": STATUS_STYLES[selectedIssue.status]?.color,
              }}
            >
              <div className="issue-detail__hero-top">
                <StatusPill value={selectedIssue.status} />
                <span className="issue-detail__id">Mã #{selectedIssue.id}</span>
              </div>

              <h3 className="issue-detail__title">
                {selectedIssue.title || "—"}
              </h3>

              <div className="issue-detail__tags">
                <TagPill
                  prefix="Loại"
                  label={
                    CATEGORY_LABELS[selectedIssue.category] ||
                    selectedIssue.category
                  }
                  color={CATEGORY_COLORS[selectedIssue.category]}
                />
                <TagPill
                  prefix="Mức độ"
                  label={
                    PRIORITY_CONFIG[selectedIssue.priority]?.label ||
                    selectedIssue.priority
                  }
                  color={PRIORITY_COLORS[selectedIssue.priority]}
                />
              </div>
            </section>

            {/* THÔNG TIN */}
            <section className="issue-detail__grid">
              <div className="issue-info">
                <HomeOutlined />
                <div>
                  <span>Phòng</span>
                  <b>{selectedIssue.roomNumber || "—"}</b>
                  <small>{selectedIssue.buildingName || "—"}</small>
                </div>
              </div>

              <div className="issue-info">
                <UserOutlined />
                <div>
                  <span>Người báo</span>
                  <b>{selectedIssue.tenantName || "—"}</b>
                </div>
              </div>

              <div className="issue-info">
                <CalendarOutlined />
                <div>
                  <span>Ngày báo</span>
                  <b>{formatDateTime(selectedIssue.createdAt)}</b>
                </div>
              </div>

              <div className="issue-info">
                <ClockCircleOutlined />
                <div>
                  <span>Cập nhật cuối</span>
                  <b>{formatDateTime(selectedIssue.updatedAt)}</b>
                </div>
              </div>
            </section>

            {/* MÔ TẢ + GHI CHÚ */}
            <section className="issue-detail__block">
              <h4>Mô tả sự cố</h4>
              <p>{selectedIssue.description || "Chưa có mô tả"}</p>
            </section>

            <section className="issue-detail__block">
              <h4>Ghi chú của khách (thời gian có thể đến sửa)</h4>
              <p className={selectedIssue.note ? "" : "is-empty"}>
                {selectedIssue.note || "Khách không để lại ghi chú"}
              </p>
            </section>

            {/* TIẾN TRÌNH */}
            <section className="issue-detail__block">
              <h4>Tiến trình xử lý</h4>

              <ol className="issue-tl">
                {buildSteps(selectedIssue).map((step) => (
                  <li
                    key={step.key}
                    className={`issue-tl__item is-${step.state}`}
                    style={{ "--tl-color": STATUS_COLORS[step.key] }}
                  >
                    <span className="issue-tl__dot">
                      {step.state === "done" && <CheckOutlined />}
                      {step.state === "cancelled" && <CloseCircleOutlined />}
                    </span>

                    <div className="issue-tl__body">
                      <b>{STATUS_CONFIG[step.key]?.label}</b>
                      <span>{STEP_DESCRIPTIONS[step.key]}</span>
                      {step.time && <time>{formatDateTime(step.time)}</time>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </Drawer>
    </Fragment>
  );
};

export default IssuePage;
