import React, { useEffect, useState } from "react";
import {
  Button,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
  Grid,
  Alert,
  Col,
  Row,
  Drawer,
  Spin,
} from "antd";
import {
  SearchOutlined,
  EyeOutlined,
  LockOutlined,
  UnlockOutlined,
  SafetyOutlined,
  KeyOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";

import "../../../assets/style/FilterBar.css";
import "./UserPage.css";

import MyCard from "../../../components/MyCard";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";
import CommonSelect from "../../../components/CommonSelect";
import { useNotify } from "../../../components/NotificationProvider";

import {
  getUsers,
  getUserById,
  createTenantAccount,
  updateUserStatus,
  resetUserPassword,
} from "../../../api/userApi";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ROLE_CONFIG = {
  ADMIN: {
    color: "#722ed1",
    text: "Quản trị viên",
  },
  TENANT: {
    color: "#1677ff",
    text: "Người thuê",
  },
};

const STATUS_CONFIG = {
  ACTIVE: {
    color: "#16a34a",
    background: "#f0fdf4",
    border: "#bbf7d0",
    text: "Đang hoạt động",
  },
  INACTIVE: {
    color: "#dc2626",
    background: "#fef2f2",
    border: "#fecaca",
    text: "Đã vô hiệu hóa",
  },
};

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN");
};

const RoleDisplay = ({ value }) => {
  const config = ROLE_CONFIG[value];

  if (!config) return <span>{value || "—"}</span>;

  return (
    <span className="user-role">
      <span
        className="user-role__dot"
        style={{ backgroundColor: config.color }}
      />
      <span>{config.text}</span>
    </span>
  );
};

const StatusDisplay = ({ value }) => {
  const config = STATUS_CONFIG[value];

  if (!config) return <span>—</span>;

  return (
    <span
      className="user-status"
      style={{
        color: config.color,
        backgroundColor: config.background,
        borderColor: config.border,
      }}
    >
      <span
        className="user-status__dot"
        style={{ backgroundColor: config.color }}
      />
      {config.text}
    </span>
  );
};

const UserPage = () => {
  const { notify, contextHolder } = useNotify();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // DATA
  const [users, setUsers] = useState({
    items: [],
    totalItems: 0,
  });

  // SEARCH & FILTER
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState(undefined);
  const [status, setStatus] = useState(undefined);

  // PAGINATION
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  // LOADING
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // RELOAD
  const [reloadKey, setReloadKey] = useState(0);

  // DETAIL DRAWER
  const [detail, setDetail] = useState({
    open: false,
    record: null,
    loading: false,
  });

  // RESET CONFIRMATION MODAL
  const [resetConfirm, setResetConfirm] = useState({
    open: false,
    record: null,
  });

  // GET USERS
  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setLoading(true);

      try {
        const data = await getUsers({
          keyword: keyword.trim() || undefined,
          role,
          status,
          page: pagination.page,
          size: pagination.size,
        });

        if (cancelled) return;

        setUsers({
          items: data?.items || [],
          totalItems: data?.totalItems || 0,
        });
      } catch (error) {
        if (cancelled) return;

        console.error("Get users error:", error);

        notify({
          type: "error",
          message: "Lỗi tải dữ liệu",
          description:
            error?.response?.data?.message ||
            "Không thể tải danh sách tài khoản.",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [keyword, role, status, pagination.page, pagination.size, reloadKey]);

  // SEARCH
  const handleKeywordChange = (event) => {
    setKeyword(event.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // FILTER ROLE
  const handleRoleChange = (value) => {
    setRole(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // FILTER STATUS
  const handleStatusChange = (value) => {
    setStatus(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // PAGINATION
  const handlePageChange = (page, size) => {
    setPagination((prev) => {
      if (prev.page === page && prev.size === size) return prev;
      return { page, size };
    });
  };

  // VIEW DETAIL
  const handleViewDetail = async (record) => {
    setDetail({
      open: true,
      record,
      loading: true,
    });

    try {
      const data = await getUserById(record.id);

      setDetail({
        open: true,
        record: data,
        loading: false,
      });
    } catch (error) {
      console.error("Get user detail error:", error);

      setDetail({
        open: true,
        record,
        loading: false,
      });

      notify({
        type: "error",
        message: "Không thể tải chi tiết",
        description:
          error?.response?.data?.message ||
          "Không thể tải thông tin tài khoản.",
      });
    }
  };

  const closeDetail = () => {
    setDetail({
      open: false,
      record: null,
      loading: false,
    });
  };

  // UPDATE STATUS
  const handleUpdateStatus = async (record) => {
    const nextStatus = record.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      setActionLoading(true);

      await updateUserStatus(record.id, nextStatus);

      notify({
        type: "success",
        message: "Cập nhật trạng thái thành công",
        description:
          nextStatus === "ACTIVE"
            ? "Tài khoản đã được kích hoạt."
            : "Tài khoản đã bị vô hiệu hóa.",
      });

      setReloadKey((prev) => prev + 1);

      if (detail.record?.id === record.id) {
        setDetail((prev) => ({
          ...prev,
          record: {
            ...prev.record,
            status: nextStatus,
          },
        }));
      }
    } catch (error) {
      console.error("Update user status error:", error);

      notify({
        type: "error",
        message: "Cập nhật thất bại",
        description:
          error?.response?.data?.message ||
          "Không thể cập nhật trạng thái tài khoản.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // OPEN RESET CONFIRMATION
  const openResetConfirm = (record) => {
    setResetConfirm({
      open: true,
      record,
    });
  };

  // CLOSE RESET CONFIRMATION
  const closeResetConfirm = () => {
    if (actionLoading) return;

    setResetConfirm({
      open: false,
      record: null,
    });
  };

  // CONFIRM RESET PASSWORD
  const confirmResetPassword = async () => {
    const record = resetConfirm.record;

    if (!record) return;

    try {
      setActionLoading(true);

      await resetUserPassword(record.id);

      setResetConfirm({
        open: false,
        record: null,
      });

      if (detail.record?.id === record.id) {
        setDetail((prev) => ({
          ...prev,
          record: {
            ...prev.record,
            mustChangePassword: true,
          },
        }));
      }

      notify({
        type: "success",
        message: "Đặt lại mật khẩu thành công",
        description: `Mật khẩu tài khoản ${record.username} đã được đặt lại về 123456.`,
      });
    } catch (error) {
      console.error("Reset password error:", error);

      notify({
        type: "error",
        message: "Đặt lại mật khẩu thất bại",
        description:
          error?.response?.data?.message ||
          "Không thể đặt lại mật khẩu tài khoản.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // TABLE COLUMNS
  const columns = [
    {
      title: "Tài khoản",
      dataIndex: "username",
      key: "username",
      width: 150,
      render: (username) => <Text strong>{username || "—"}</Text>,
    },
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      key: "fullName",
      width: 150,
      render: (fullName) => fullName || "—",
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      width: 100,
      render: (value) => <RoleDisplay value={value} />,
    },
    {
      title: "Đăng nhập gần nhất",
      dataIndex: "lastLoginAt",
      key: "lastLoginAt",
      width: 160,
      render: (value) => formatDateTime(value),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (value) => formatDateTime(value),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 170,
      render: (value) => <StatusDisplay value={value} />,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              aria-label={`Xem tài khoản ${record.username}`}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>

          {record.status === "ACTIVE" ? (
            <Popconfirm
              title="Vô hiệu hóa tài khoản?"
              description="Người dùng sẽ không thể đăng nhập khi tài khoản bị vô hiệu hóa."
              okText="Vô hiệu hóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleUpdateStatus(record)}
            >
              <Tooltip title="Vô hiệu hóa tài khoản">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<LockOutlined />}
                  aria-label={`Vô hiệu hóa ${record.username}`}
                  disabled={actionLoading}
                />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Kích hoạt tài khoản?"
              description="Cho phép người dùng đăng nhập trở lại."
              okText="Kích hoạt"
              cancelText="Hủy"
              onConfirm={() => handleUpdateStatus(record)}
            >
              <Tooltip title="Kích hoạt tài khoản">
                <Button
                  type="text"
                  size="small"
                  icon={<UnlockOutlined />}
                  aria-label={`Kích hoạt ${record.username}`}
                  disabled={actionLoading}
                  className="user-action-unlock"
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <PageHeader
        title="Quản lý tài khoản"
        description="Quản lý tài khoản đăng nhập, trạng thái và mật khẩu người dùng."
      />

      <Flex vertical gap={20}>
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            <Col xs={24} md={12} xl={14}>
              <Input
                allowClear
                value={keyword}
                placeholder="Tìm theo tài khoản hoặc họ tên..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                onChange={handleKeywordChange}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={4}>
              <CommonSelect
                allowClear
                placeholder="Vai trò"
                value={role}
                options={[
                  { value: "ADMIN", label: "Quản trị viên" },
                  { value: "TENANT", label: "Người thuê" },
                ]}
                onChange={handleRoleChange}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={4}>
              <CommonSelect
                allowClear
                placeholder="Trạng thái"
                value={status}
                options={[
                  { value: "ACTIVE", label: "Đang hoạt động" },
                  { value: "INACTIVE", label: "Đã vô hiệu hóa" },
                ]}
                onChange={handleStatusChange}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={2}>
              <Button
                block
                onClick={() => {
                  setKeyword("");
                  setRole(undefined);
                  setStatus(undefined);
                  setPagination((prev) => ({
                    ...prev,
                    page: 1,
                  }));
                }}
                className="app-filter__clear"
              >
                Xóa lọc
              </Button>
            </Col>
          </Row>
        </MyCard>

        <MyCard title="Danh sách tài khoản">
          <CommonTable
            columns={columns}
            dataSource={users.items}
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: users.totalItems,
            }}
            onPageChange={handlePageChange}
            emptyText="Chưa có tài khoản nào"
            totalText="tài khoản"
          />
        </MyCard>
      </Flex>

      {/* USER DETAIL DRAWER */}
      <Drawer
        title={
          <div className="user-drawer-title">
            <span>Chi tiết tài khoản</span>
          </div>
        }
        open={detail.open}
        onClose={closeDetail}
        width="min(520px, 100vw)"
        placement={isMobile ? "bottom" : "right"}
        height="92%"
        rootClassName="user-detail-drawer"
        destroyOnHidden
        footer={
          <div className="user-detail__footer">
            <Button
              icon={<SafetyOutlined />}
              disabled={detail.loading || !detail.record || actionLoading}
              onClick={() => openResetConfirm(detail.record)}
              className="user-detail__reset-btn"
            >
              Cấp lại mật khẩu
            </Button>
          </div>
        }
      >
        <Spin spinning={detail.loading}>
          {detail.record && (
            <div className="user-detail">
              <section className="user-detail__hero">
                <div className="user-detail__avatar">
                  {(detail.record.fullName || detail.record.username || "U")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="user-detail__identity">
                  <h2>{detail.record.fullName || "Chưa cập nhật họ tên"}</h2>
                  <span>@{detail.record.username || "—"}</span>
                </div>

                <div className="user-detail__badges">
                  <RoleDisplay value={detail.record.role} />
                  <StatusDisplay value={detail.record.status} />
                </div>
              </section>

              <section className="user-detail__section">
                <div className="user-detail__section-head">
                  <h3>Thông tin chung</h3>
                </div>

                <div className="user-detail__info">
                  <div className="user-detail__row">
                    <span>Mã tài khoản</span>
                    <strong>{detail.record.id ?? "—"}</strong>
                  </div>

                  <div className="user-detail__row">
                    <span>Tên đăng nhập</span>
                    <strong>{detail.record.username || "—"}</strong>
                  </div>

                  <div className="user-detail__row">
                    <span>Họ và tên</span>
                    <strong>{detail.record.fullName || "—"}</strong>
                  </div>

                  <div className="user-detail__row">
                    <span>Vai trò</span>
                    <strong>
                      {ROLE_CONFIG[detail.record.role]?.text ||
                        detail.record.role ||
                        "—"}
                    </strong>
                  </div>

                  <div className="user-detail__row">
                    <span>Trạng thái</span>
                    <strong>
                      {STATUS_CONFIG[detail.record.status]?.text ||
                        detail.record.status ||
                        "—"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="user-detail__section">
                <div className="user-detail__section-head">
                  <h3>Bảo mật</h3>
                </div>

                <div className="user-detail__security">
                  <div className="user-detail__security-icon">
                    <SafetyOutlined />
                  </div>

                  <div className="user-detail__security-content">
                    <strong>Yêu cầu đổi mật khẩu</strong>
                    <span>
                      {detail.record.mustChangePassword === true
                        ? "Người dùng cần đổi mật khẩu khi đăng nhập."
                        : detail.record.mustChangePassword === false
                          ? "Không yêu cầu đổi mật khẩu khi đăng nhập."
                          : "Chưa có thông tin."}
                    </span>
                  </div>

                  <Tag
                    color={
                      detail.record.mustChangePassword === true
                        ? "warning"
                        : detail.record.mustChangePassword === false
                          ? "success"
                          : "default"
                    }
                  >
                    {detail.record.mustChangePassword === true
                      ? "Có"
                      : detail.record.mustChangePassword === false
                        ? "Không"
                        : "—"}
                  </Tag>
                </div>
              </section>

              <section className="user-detail__section">
                <div className="user-detail__section-head">
                  <h3>Lịch sử hoạt động</h3>
                </div>

                <div className="user-detail__info">
                  <div className="user-detail__row">
                    <span>Đăng nhập gần nhất</span>
                    <strong>{formatDateTime(detail.record.lastLoginAt)}</strong>
                  </div>

                  <div className="user-detail__row">
                    <span>Ngày tạo tài khoản</span>
                    <strong>{formatDateTime(detail.record.createdAt)}</strong>
                  </div>

                  <div className="user-detail__row">
                    <span>Cập nhật lần cuối</span>
                    <strong>{formatDateTime(detail.record.updatedAt)}</strong>
                  </div>
                </div>
              </section>
            </div>
          )}
        </Spin>
      </Drawer>

      {/* RESET PASSWORD CONFIRMATION MODAL */}
      <Modal
        title={
          <div className="reset-modal__title">
            <span className="reset-modal__title-icon">
              <ExclamationCircleOutlined />
            </span>
            <span>Xác nhận đặt lại mật khẩu</span>
          </div>
        }
        open={resetConfirm.open}
        onCancel={closeResetConfirm}
        onOk={confirmResetPassword}
        okText="Xác nhận"
        cancelText="Hủy"
        okButtonProps={{
          danger: true,
          loading: actionLoading,
        }}
        cancelButtonProps={{
          disabled: actionLoading,
        }}
        closable={!actionLoading}
        maskClosable={!actionLoading}
        keyboard={!actionLoading}
        className="reset-confirm-modal"
        destroyOnHidden
      >
        <div className="reset-modal__body">
          <p className="reset-modal__description">
            Bạn đang thực hiện đặt lại mật khẩu cho tài khoản:
          </p>

          <div className="reset-modal__account">
            <span className="reset-modal__account-icon">
              <UserOutlined />
            </span>
            <div>
              <span className="reset-modal__label">Tài khoản</span>
              <strong>{resetConfirm.record?.username || "—"}</strong>
            </div>
          </div>

          <div className="reset-modal__password">
            <div className="reset-modal__password-heading">
              <KeyOutlined />
              <span>Mật khẩu mặc định mới</span>
            </div>
            <div className="reset-modal__password-value">123456</div>
          </div>

          <p className="reset-modal__question">
            Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản này không?
          </p>
        </div>
      </Modal>
    </>
  );
};

export default UserPage;
