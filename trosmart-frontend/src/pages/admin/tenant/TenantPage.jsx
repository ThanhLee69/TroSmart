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
  Flex,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  IdcardOutlined,
  PhoneOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

import {
  getTenants,
  getTenantDashboard,
  createTenant,
  updateTenant,
  updateTenantIdentityImages,
} from "../../../api/tenantApi";

import MyCard from "../../../components/MyCard";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";
import CommonStatisticCards from "../../../components/CommonStatisticCards";
import { useNotify } from "../../../components/NotificationProvider";
import TenantForm from "./TenantFrom";
import { path_name } from "../../../constants/path_name";
import "../../../assets/style/FilterBar.css";
import "./TenantPage.css";

const { Text } = Typography;

const GENDER_OPTIONS = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
];

const RENTAL_STATUS_OPTIONS = [
  { value: "RENTING", label: "Đang thuê" },
  { value: "RETURNED", label: "Đã trả phòng" },
  { value: "NOT_RENTED", label: "Chưa từng thuê" },
];

const RENTAL_STATUS_LABELS = {
  RENTING: "Đang thuê",
  RETURNED: "Đã trả phòng",
  NOT_RENTED: "Chưa từng thuê",
};

const getRentalStatusLabel = (status) =>
  RENTAL_STATUS_LABELS[status] || "Chưa xác định";

const RENTAL_STATUS_KEYS = {
  RENTING: "renting",
  RETURNED: "returned",
  NOT_RENTED: "never",
};

// Chấm màu + chữ, bọc nền nhạt (không dùng Tag)
const StatusPill = ({ tone, children }) => (
  <span className={`ts-pill ts-pill--${tone}`}>
    <i />
    {children}
  </span>
);

const formatDate = (value) => {
  if (!value) return "—";

  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "—";
};

const formatGender = (gender) =>
  GENDER_OPTIONS.find((item) => item.value === gender)?.label || gender || "—";

const TenantPage = () => {
  const { notify, contextHolder } = useNotify();
  const navigate = useNavigate();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const [form] = Form.useForm();

  const [keyword, setKeyword] = useState("");
  const [rentalStatus, setRentalStatus] = useState(undefined);

  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  const [tenants, setTenants] = useState({
    items: [],
    totalItems: 0,
  });

  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formModal, setFormModal] = useState({
    open: false,
    mode: "add",
    record: null,
  });

  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);

  // Lấy danh sách khách thuê theo từ khóa, trạng thái và phân trang
  const fetchTenants = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getTenants({
        keyword: keyword.trim() || undefined,
        rentalStatus,
        page: pagination.page,
        size: pagination.size,
      });

      setTenants({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      console.error("Lấy danh sách khách thuê thất bại:", error);

      setTenants({
        items: [],
        totalItems: 0,
      });

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách khách thuê",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [keyword, rentalStatus, pagination.page, pagination.size]);

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await getTenantDashboard();
      setDashboard(data ?? {});
    } catch (error) {
      console.error("Lấy thống kê khách thuê thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể tải thống kê khách thuê",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const openForm = (mode, record = null) => {
    setFormModal({
      open: true,
      mode,
      record,
    });

    setFrontImage(null);
    setBackImage(null);
    form.resetFields();

    if (record) {
      form.setFieldsValue({
        fullName: record.fullName,
        phone: record.phone,
        email: record.email,
        identityNumber: record.identityNumber,
        dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
        gender: record.gender,
        permanentAddress: record.permanentAddress,
        occupation: record.occupation,
        note: record.note,
      });
    }
  };

  const closeForm = () => {
    if (submitting) return;

    setFormModal({
      open: false,
      mode: "add",
      record: null,
    });

    setFrontImage(null);
    setBackImage(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format("YYYY-MM-DD")
          : null,
      };

      delete payload.identityFrontImage;
      delete payload.identityBackImage;

      if (formModal.mode === "edit") {
        const formData = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });

        await updateTenant(formModal.record.id, formData);

        if (frontImage || backImage) {
          await updateTenantIdentityImages(
            formModal.record.id,
            frontImage,
            backImage,
          );
        }

        notifyRef.current({
          type: "success",
          message: "Cập nhật khách thuê thành công",
        });
      } else {
        const response = await createTenant(payload);
        const createdTenant = response?.result;

        if (createdTenant?.id && (frontImage || backImage)) {
          await updateTenantIdentityImages(
            createdTenant.id,
            frontImage,
            backImage,
          );
        }

        notifyRef.current({
          type: "success",
          message: "Thêm khách thuê thành công",
        });
      }

      setFormModal({
        open: false,
        mode: "add",
        record: null,
      });

      setFrontImage(null);
      setBackImage(null);
      form.resetFields();

      await Promise.all([fetchTenants(), fetchDashboard()]);
    } catch (error) {
      if (error?.errorFields) return;

      console.error("Lưu khách thuê thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể lưu khách thuê",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra dữ liệu và thử lại.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Thay đổi từ khóa tìm kiếm và quay về trang đầu
  const handleSearch = (value) => {
    setKeyword(value);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // Thay đổi trạng thái lọc và quay về trang đầu
  const handleRentalStatusChange = (value) => {
    setRentalStatus(value);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // Xóa toàn bộ bộ lọc
  const clearFilters = () => {
    setKeyword("");
    setRentalStatus(undefined);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const statisticCards = [
    {
      key: "total",
      title: "Tổng khách thuê",
      value: dashboard.totalTenants ?? 0,
      description: "Tổng số hồ sơ khách thuê",
      icon: <TeamOutlined />,
      color: "#536ee7",
      background: "#eef1ff",
    },
    {
      key: "renting",
      title: "Đang thuê",
      value: dashboard.rentingTenants ?? 0,
      description: "Khách đang thuê phòng",
      icon: <UserOutlined />,
      color: "#16a34a",
      background: "#eaf8ef",
    },
    {
      key: "returned",
      title: "Đã trả phòng",
      value: dashboard.returnedTenants ?? 0,
      description: "Khách đã kết thúc thuê",
      icon: <DeleteOutlined />,
      color: "#d97706",
      background: "#fff7e8",
    },
    {
      key: "noAccount",
      title: "Chưa có tài khoản",
      value: dashboard.tenantsWithoutAccount ?? 0,
      description: "Hồ sơ chưa liên kết tài khoản",
      icon: <IdcardOutlined />,
      color: "#7c3aed",
      background: "#f3e8ff",
    },
  ];

  const columns = [
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      key: "fullName",
      width: 190,
      render: (value) => <Text strong>{value || "—"}</Text>,
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      width: 150,
      render: (value) =>
        value ? (
          <span className="ts-phone">
            <PhoneOutlined />
            {value}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "CCCD",
      dataIndex: "identityNumber",
      key: "identityNumber",
      width: 145,
      render: (value) => value || "—",
    },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      width: 100,
      render: (value) => formatGender(value),
    },
    {
      title: "Phòng đang thuê",
      key: "rentalLocation",
      width: 180,
      ellipsis: true,
      render: (_, record) => {
        if (!record.roomNumber && !record.buildingName) {
          return <span className="ts-empty">Chưa có</span>;
        }

        return [
          record.roomNumber ? `Phòng ${record.roomNumber}` : null,
          record.buildingName ? `Tòa ${record.buildingName}` : null,
        ]
          .filter(Boolean)
          .join(" - ");
      },
    },
    {
      title: "Trạng thái thuê",
      dataIndex: "rentalStatus",
      key: "rentalStatus",
      width: 150,
      render: (value) => (
        <StatusPill tone={RENTAL_STATUS_KEYS[value] || "none"}>
          {getRentalStatusLabel(value)}
        </StatusPill>
      ),
    },
    {
      title: "Tài khoản",
      dataIndex: "userId",
      key: "userId",
      width: 150,
      render: (value) =>
        value ? (
          <StatusPill tone="linked">Đã liên kết</StatusPill>
        ) : (
          <StatusPill tone="unlinked">Chưa liên kết</StatusPill>
        ),
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right",
      width: 76,
      align: "center",
      render: (_, record) => (
        <Space size={4} className="ts-actions">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              size="small"
              className="ts-act"
              icon={<EyeOutlined />}
              aria-label={`Xem khách thuê ${record.fullName || ""}`}
              onClick={() => navigate(`${path_name.tenant}/${record.id}`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Fragment>
      {contextHolder}

      <PageHeader
        title="Quản lý khách thuê"
        description="Quản lý hồ sơ cá nhân, thông tin thuê phòng và tài khoản khách thuê."
        buttonText="Thêm khách thuê"
        onButtonClick={() => openForm("add")}
      />

      <Flex vertical gap={20}>
        <MyCard title="Tìm kiếm khách thuê">
          <Row gutter={[12, 12]} className="app-filter">
            <Col xs={24} md={24} xl={16}>
              <Input
                allowClear
                placeholder="Tìm theo tên, số điện thoại hoặc CCCD..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                value={keyword}
                onChange={(event) => handleSearch(event.target.value)}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={6}>
              <Select
                allowClear
                style={{ width: "100%" }}
                placeholder="Trạng thái thuê"
                value={rentalStatus}
                options={RENTAL_STATUS_OPTIONS}
                onChange={handleRentalStatusChange}
              />
            </Col>
            <Col xs={24} sm={12} md={12} xl={2}>
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

        <MyCard title="Danh sách khách thuê">
          <CommonTable
            columns={columns}
            dataSource={tenants.items}
            rowKey="id"
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: tenants.totalItems,
            }}
            onPageChange={(page, size) => {
              setPagination({ page, size });
            }}
            emptyText="Chưa có hồ sơ khách thuê"
            totalText="khách thuê"
          />
        </MyCard>
      </Flex>

      <TenantForm
        isMode={formModal.mode}
        record={formModal.record}
        isModal={formModal.open}
        hideModal={closeForm}
        fetchTenants={fetchTenants}
        notify={notify}
      />
    </Fragment>
  );
};

export default TenantPage;
