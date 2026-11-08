import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, Col, Flex, Input, Row, Tooltip, Typography } from "antd";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  FlagOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  deleteNotification,
  getNotificationDashboard,
  getNotifications,
  sendNotification,
} from "../../../api/notificationApi";

import MyCard from "../../../components/MyCard";
import { useNotify } from "../../../components/NotificationProvider";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";
import CommonStatisticCards from "../../../components/CommonStatisticCards";
import CommonSelect from "../../../components/CommonSelect";
import NotificationDetailDrawer from "./NotificationDetailDrawer";
import NotificationFormModal from "./NotificationFormModal";
import {
  DISPLAY_DATE_TIME_FORMAT,
  NOTIFICATION_PRIORITY_COLORS,
  NOTIFICATION_PRIORITY_OPTIONS,
  NOTIFICATION_STATUS_COLORS,
  NOTIFICATION_STATUS_OPTIONS,
  NOTIFICATION_TARGET_OPTIONS,
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_TYPE_FILTER_OPTIONS,
  NOTIFICATION_TYPE_LABELS,
} from "./notificationConstants";
import "./NotificationPage.css";
import "../../../assets/style/FilterBar.css";

const { Text } = Typography;

const KEYWORD_DEBOUNCE_MS = 400;

const INITIAL_FILTERS = {
  keyword: "",
  type: undefined,
  status: undefined,
  targetType: undefined,
};

const formatDateTime = (value) =>
  value ? dayjs(value).format(DISPLAY_DATE_TIME_FORMAT) : "—";

const labelOf = (options, value) =>
  options.find((option) => option.value === value)?.label ?? value;

// Tên màu của constants (antd) -> class tông màu trong CSS
const toneOf = (color) => `nt-tone--${color || "default"}`;

// Màu chấm của mức độ ưu tiên; chưa khai báo thì "Cao" đỏ, còn lại xám
const priorityColor = (value) =>
  NOTIFICATION_PRIORITY_COLORS[value] || (value === "HIGH" ? "red" : "default");

const NotificationPage = () => {
  const { notify, contextHolder } = useNotify();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // =========================
  // FILTERS
  // =========================
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Ô tìm kiếm gõ tới đâu giữ tới đó, sau 400ms mới đưa vào bộ lọc để gọi API
  const [keywordInput, setKeywordInput] = useState("");

  const [pagination, setPagination] = useState({ page: 1, size: 10 });

  // =========================
  // DATA
  // =========================
  const [notifications, setNotifications] = useState({
    items: [],
    totalItems: 0,
  });
  const [loading, setLoading] = useState(false);

  // Số liệu cho các thẻ thống kê
  const [dashboard, setDashboard] = useState({});

  // =========================
  // FORM / DRAWER
  // =========================
  const [formState, setFormState] = useState({ open: false, id: null });
  const [drawerState, setDrawerState] = useState({ open: false, id: null });
  const [drawerReloadKey, setDrawerReloadKey] = useState(0);

  // =========================
  // LOAD DANH SÁCH
  // =========================
  const fetchNotifications = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getNotifications({
        keyword: filters.keyword.trim() || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        targetType: filters.targetType || undefined,
        page: pagination.page,
        size: pagination.size,
      });

      setNotifications({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      setNotifications({ items: [], totalItems: 0 });

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách thông báo",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    filters.keyword,
    filters.type,
    filters.status,
    filters.targetType,
    pagination.page,
    pagination.size,
  ]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // =========================
  // LOAD THỐNG KÊ
  // =========================
  const loadDashboard = useCallback(async () => {
    try {
      const data = await getNotificationDashboard();
      setDashboard(data ?? {});
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: "Không thể tải thống kê thông báo",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // =========================
  // BỘ LỌC
  // =========================
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) =>
        prev.keyword === keywordInput
          ? prev
          : { ...prev, keyword: keywordInput },
      );
      setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }, KEYWORD_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setKeywordInput("");
    setFilters(INITIAL_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // =========================
  // THAO TÁC
  // =========================
  const refreshAll = () => {
    fetchNotifications();
    loadDashboard();
    setDrawerReloadKey((key) => key + 1);
  };

  const handleAction = async (action, record) => {
    try {
      if (action === "send") {
        const sent = await sendNotification(record.id);

        notifyRef.current({
          type: "success",
          message: "Đã gửi thông báo!",
          description: `Gửi tới ${sent?.recipientCount ?? 0} khách thuê`,
        });
      } else if (action === "delete") {
        await deleteNotification(record.id);

        notifyRef.current({
          type: "success",
          message: "Đã xóa thông báo",
        });

        // Xóa dòng cuối của trang thì lùi về trang trước
        if (notifications.items.length === 1 && pagination.page > 1) {
          setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
        }

        setDrawerState({ open: false, id: null });
      }
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: "Thao tác thất bại!",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      // Dù thành công hay lỗi đều tải lại: trạng thái có thể đã đổi do người khác
      refreshAll();
    }
  };

  const openCreate = () => setFormState({ open: true, id: null });
  const openEdit = (record) => setFormState({ open: true, id: record.id });
  const openDetail = (record) => setDrawerState({ open: true, id: record.id });

  const handleSaved = () => {
    setFormState({ open: false, id: null });
    refreshAll();
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      title: "Tiêu đề",
      key: "title",
      width: 280,
      render: (_, record) => (
        <div className="ntp-title">
          <Typography.Link
            strong
            ellipsis
            onClick={() => openDetail(record)}
            aria-label={`Xem thông báo ${record.title}`}
          >
            {record.title}
          </Typography.Link>
        </div>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 170,
      render: (value) => (
        <span
          className={`ntp-dot-text ${toneOf(NOTIFICATION_TYPE_COLORS[value])}`}
        >
          <i className="nt-dot" />
          {NOTIFICATION_TYPE_LABELS[value] ?? value}
        </span>
      ),
    },
    {
      title: "Mức độ",
      dataIndex: "priority",
      key: "priority",
      width: 130,
      render: (value) => (
        <span className={`ntp-dot-text ${toneOf(priorityColor(value))}`}>
          <i className="nt-dot" />
          {labelOf(NOTIFICATION_PRIORITY_OPTIONS, value)}
        </span>
      ),
    },
    {
      title: "Gửi cho",
      key: "target",
      width: 190,
      ellipsis: true,
      render: (_, record) => <div>{record.targetName || "—"}</div>,
    },

    {
      title: "Thời gian",
      key: "time",
      width: 170,
      render: (_, record) => {
        if (record.status === "SENT") {
          return (
            <div>
              <div>{formatDateTime(record.sentAt)}</div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Đã gửi</div>
            </div>
          );
        }

        if (record.scheduledAt) {
          return (
            <div>
              <div>{formatDateTime(record.scheduledAt)}</div>
              <div style={{ fontSize: 12, color: "#8c8c8c" }}>Hẹn gửi</div>
            </div>
          );
        }

        return (
          <div>
            <div>{formatDateTime(record.createdAt)}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>Ngày tạo</div>
          </div>
        );
      },
    },
    {
      title: "Đã đọc",
      key: "read",
      width: 110,
      render: (_, record) => {
        if (record.status !== "SENT") {
          return <Text type="secondary">—</Text>;
        }

        return (
          <Text style={{ color: "#151b3b" }}>
            {record.readCount ?? 0}/{record.recipientCount ?? 0}
          </Text>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (value) => (
        <span
          className={`ntp-state ${toneOf(NOTIFICATION_STATUS_COLORS[value])}`}
        >
          <i className="nt-dot" />
          {labelOf(NOTIFICATION_STATUS_OPTIONS, value)}
        </span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 76,
      fixed: "right",
      align: "center",
      render: (_, record) => (
        <Tooltip title="Xem chi tiết">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => openDetail(record)}
            aria-label={`Xem chi tiết ${record.title}`}
          ></Button>
        </Tooltip>
      ),
    },
  ];

  // =========================
  // STATISTICS
  // =========================
  const totalCount = dashboard.totalCount ?? 0;
  const percentOfTotal = (value) =>
    totalCount > 0
      ? ((Number(value ?? 0) / totalCount) * 100).toFixed(1)
      : "0.0";

  const statisticCards = [
    {
      key: "total",
      title: "Tổng thông báo",
      value: totalCount,
      description: "Tất cả thông báo đã tạo",
      icon: <AppstoreOutlined />,
      color: "#536ee7",
      background: "#eef1ff",
    },
    {
      key: "sent",
      title: "Đã gửi",
      value: dashboard.sentCount ?? 0,
      description: `Chiếm ${percentOfTotal(dashboard.sentCount)}% tổng số`,
      icon: <SendOutlined />,
      color: "#16a34a",
      background: "#eaf8ef",
    },
    {
      key: "draft",
      title: "Bản nháp",
      value: dashboard.draftCount ?? 0,
      description: "Soạn xong nhưng chưa gửi",
      icon: <EditOutlined />,
      color: "#5b6385",
      background: "#f1f3fb",
    },
    {
      key: "scheduled",
      title: "Đã lên lịch",
      value: dashboard.scheduledCount ?? 0,
      description: dashboard.nextScheduledAt
        ? `Gần nhất: ${dayjs(dashboard.nextScheduledAt).format("DD/MM HH:mm")}`
        : "Chưa có thông báo chờ gửi",
      icon: <ClockCircleOutlined />,
      color: "#d97706",
      background: "#fff7e8",
    },
  ];

  // =========================
  // RENDER
  // =========================
  return (
    <Fragment>
      {contextHolder}

      <PageHeader
        title="Quản lý thông báo"
        description="Soạn, hẹn giờ và theo dõi thông báo gửi tới khách thuê."
        buttonText="Soạn thông báo"
        onButtonClick={openCreate}
      />

      <Flex vertical gap={20}>
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[12, 12]} className="app-filter">
            <Col xs={24} md={12} xl={10}>
              <Input
                allowClear
                value={keywordInput}
                placeholder="Tìm theo tiêu đề..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={4}>
              <CommonSelect
                allowClear
                placeholder="Loại thông báo"
                value={filters.type}
                options={NOTIFICATION_TYPE_FILTER_OPTIONS}
                onChange={(value) => updateFilter("type", value)}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} md={10} xl={4}>
              <CommonSelect
                allowClear
                placeholder="Trạng thái"
                value={filters.status}
                options={NOTIFICATION_STATUS_OPTIONS}
                onChange={(value) => updateFilter("status", value)}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} md={10} xl={4}>
              <CommonSelect
                allowClear
                placeholder="Gửi cho"
                value={filters.targetType}
                options={NOTIFICATION_TARGET_OPTIONS}
                onChange={(value) => updateFilter("targetType", value)}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} md={4} xl={2}>
              <Button
                block
                onClick={clearFilters}
                className="app-filter__clear"
              >
                Xóa lọc
              </Button>
            </Col>
          </Row>
        </MyCard>

        <CommonStatisticCards items={statisticCards} />

        <MyCard title="Danh sách thông báo">
          <div className="ntp-table">
            <CommonTable
              columns={columns}
              dataSource={notifications.items}
              rowKey="id"
              loading={loading}
              pagination={{
                page: pagination.page,
                size: pagination.size,
                totalItems: notifications.totalItems,
              }}
              onPageChange={(page, size) => {
                setPagination({ page, size });
              }}
              emptyText="Chưa có thông báo nào"
              totalText="thông báo"
            />
          </div>
        </MyCard>
      </Flex>

      <NotificationFormModal
        open={formState.open}
        notificationId={formState.id}
        onClose={() => setFormState({ open: false, id: null })}
        onSaved={handleSaved}
      />

      <NotificationDetailDrawer
        open={drawerState.open}
        notificationId={drawerState.id}
        reloadKey={drawerReloadKey}
        onClose={() => setDrawerState({ open: false, id: null })}
        onAction={handleAction}
        onEdit={(record) => {
          setDrawerState({ open: false, id: null });
          openEdit(record);
        }}
      />
    </Fragment>
  );
};

export default NotificationPage;
