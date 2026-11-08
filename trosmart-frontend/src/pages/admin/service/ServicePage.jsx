import React, { useEffect, useState } from "react";
import {
  Button,
  Col,
  Flex,
  Input,
  Popconfirm,
  Row,
  Space,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import "../../../assets/style/FilterBar.css";
import "./ServicePage.css";

import MyCard from "../../../components/MyCard";
import CommonSelect from "../../../components/CommonSelect";
import ServiceForm from "./ServiceForm";
import { useNotify } from "../../../components/NotificationProvider";
import PageHeader from "../../../components/PageHeader";
import { getServices, deleteService } from "../../../api/serviceApi";
import CommonTable from "../../../components/CommonTable";

const { Text } = Typography;

// Khớp enum BillingType ở BE: USAGE, FIXED_MONTHLY, PER_PERSON
const BILLING_TYPE_CONFIG = {
  USAGE: { label: "Theo mức sử dụng", color: "#1677ff" },
  FIXED_MONTHLY: { label: "Cố định theo tháng", color: "#16a34a" },
  PER_PERSON: { label: "Theo số người", color: "#722ed1" },
};

const BILLING_TYPE_OPTIONS = Object.entries(BILLING_TYPE_CONFIG).map(
  ([value, config]) => ({
    value,
    label: config.label,
  }),
);

const DEFAULT_CONFIG = {
  true: {
    text: "Mặc định",
    color: "#16a34a",
    background: "#f0fdf4",
    border: "#bbf7d0",
  },
  false: {
    text: "Không",
    color: "#6b7280",
    background: "#f5f6fa",
    border: "#dfe2ec",
  },
};

// Dịch vụ hệ thống (ServiceCode): được sửa giá nhưng không được xóa
const PROTECTED_SERVICE_CODES = ["ELECTRICITY", "WATER", "PARKING"];

const isProtectedService = (record) =>
  PROTECTED_SERVICE_CODES.includes(record?.serviceCode);

// Tiền hiển thị kiểu 100,000 đ
const formatMoney = (value) =>
  `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })} đ`;

// Loại tính phí: chấm màu + chữ
const BillingTypeDisplay = ({ value }) => {
  const config = BILLING_TYPE_CONFIG[value];

  if (!config) return <span>{value || "—"}</span>;

  return (
    <span className="svc-type">
      <span
        className="svc-type__dot"
        style={{ backgroundColor: config.color }}
      />
      <span>{config.label}</span>
    </span>
  );
};

// Mặc định: nền nhạt + viền + chấm màu
const DefaultDisplay = ({ value }) => {
  const config = DEFAULT_CONFIG[value ? "true" : "false"];

  return (
    <span
      className="svc-default"
      style={{
        color: config.color,
        backgroundColor: config.background,
        borderColor: config.border,
      }}
    >
      <span
        className="svc-default__dot"
        style={{ backgroundColor: config.color }}
      />
      {config.text}
    </span>
  );
};

const ServicePage = () => {
  const { notify, contextHolder } = useNotify();

  // DATA
  const [services, setServices] = useState({
    items: [],
    totalItems: 0,
  });

  // SEARCH & FILTER
  const [keyword, setKeyword] = useState("");
  const [billingType, setBillingType] = useState(undefined);

  // PAGINATION
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  // LOADING
  const [loading, setLoading] = useState(false);

  // MODAL
  const [open, setOpen] = useState({
    isModal: false,
    isMode: "create",
    record: null,
  });

  // GET SERVICES
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);

        const data = await getServices({
          keyword: keyword.trim() || undefined,
          billingType: billingType || undefined,
          page: pagination.page,
          size: pagination.size,
        });

        if (cancelled) return;

        setServices({
          items: data?.items || [],
          totalItems: data?.totalItems || 0,
        });
      } catch (error) {
        if (cancelled) return;

        console.error("Get services error:", error);

        notify({
          type: "error",
          message: "Lỗi tải dữ liệu",
          description:
            error?.response?.data?.message ||
            "Không thể tải danh sách dịch vụ!",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [keyword, billingType, pagination.page, pagination.size]);

  // REFRESH DATA AFTER CREATE, UPDATE OR DELETE
  const fetchServices = async () => {
    try {
      const data = await getServices({
        keyword: keyword.trim() || undefined,
        billingType: billingType || undefined,
        page: pagination.page,
        size: pagination.size,
      });

      setServices({
        items: data?.items || [],
        totalItems: data?.totalItems || 0,
      });
    } catch (error) {
      console.error("Refresh services error:", error);

      notify({
        type: "error",
        message: "Lỗi tải dữ liệu",
        description:
          error?.response?.data?.message || "Không thể tải danh sách dịch vụ!",
      });
    }
  };

  // SEARCH
  const handleKeywordChange = (e) => {
    setKeyword(e.target.value);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // FILTER
  const handleBillingTypeChange = (value) => {
    setBillingType(value);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // PAGINATION
  const handlePageChange = (page, pageSize) => {
    setPagination({
      page,
      size: pageSize,
    });
  };

  // MODAL
  const showModal = (isMode, record = null) => {
    setOpen({
      isModal: true,
      isMode,
      record,
    });
  };

  const hideModal = () => {
    setOpen({
      isModal: false,
      isMode: "create",
      record: null,
    });
  };

  // DELETE
  const handleDelete = async (id) => {
    try {
      setLoading(true);

      await deleteService(id);

      notify({
        type: "success",
        message: "Xóa thành công!",
        description: "Đã xóa dịch vụ khỏi hệ thống.",
      });

      if (services.items.length === 1 && pagination.page > 1) {
        setPagination((prev) => ({
          ...prev,
          page: prev.page - 1,
        }));
      } else {
        await fetchServices();
      }
    } catch (error) {
      console.error("Delete service error:", error);

      notify({
        type: "error",
        message: "Xóa thất bại!",
        description: error?.response?.data?.message || "Không thể xóa dịch vụ.",
      });
    } finally {
      setLoading(false);
    }
  };

  // TABLE COLUMNS
  const columns = [
    {
      title: "Tên dịch vụ",
      dataIndex: "name",
      key: "name",
      width: 170,
      render: (name) => <Text style={{ fontWeight: 500 }}>{name || "—"}</Text>,
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 130,
      align: "right",
      render: (price) => (price != null ? formatMoney(price) : "—"),
    },
    {
      title: "Đơn vị tính",
      dataIndex: "unit",
      key: "unit",
      width: 140,
      align: "center",
      render: (unit) => unit || "—",
    },
    {
      title: "Loại tính phí",
      dataIndex: "billingType",
      key: "billingType",
      width: 190,
      render: (value) => <BillingTypeDisplay value={value} />,
    },
    {
      title: "Mặc định",
      dataIndex: "defaultService",
      key: "defaultService",
      width: 130,
      render: (value) => <DefaultDisplay value={value} />,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 300,
      render: (description) => {
        if (!description) {
          return <Text type="secondary">Chưa có mô tả</Text>;
        }

        return (
          <Tooltip title={description}>
            <span
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {description}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => showModal("edit", record)}
              aria-label={`Chỉnh sửa ${record.name}`}
            />
          </Tooltip>

          {isProtectedService(record) ? (
            <Tooltip title="Dịch vụ hệ thống, không thể xóa">
              <span className="svc-lock">
                <Button
                  type="text"
                  size="small"
                  disabled
                  icon={<LockOutlined />}
                  aria-label={`${record.name} không thể xóa`}
                />
              </span>
            </Tooltip>
          ) : (
            <Popconfirm
              title="Xóa dịch vụ?"
              description="Bạn có chắc chắn muốn xóa dịch vụ này?"
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id)}
            >
              <Tooltip title="Xóa">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label={`Xóa ${record.name}`}
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
        title="Quản lý dịch vụ"
        description="Thiết lập các dịch vụ và đơn giá áp dụng cho nhà trọ."
        buttonText="Thêm dịch vụ"
        onButtonClick={() => showModal("create")}
      />

      <Flex vertical gap={20}>
        {/* SEARCH & FILTER */}
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            <Col xs={24} md={12} xl={14}>
              <Input
                allowClear
                value={keyword}
                placeholder="Tìm theo tên dịch vụ..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                onChange={handleKeywordChange}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={6}>
              <CommonSelect
                allowClear
                placeholder="Loại tính phí"
                value={billingType}
                options={BILLING_TYPE_OPTIONS}
                onChange={handleBillingTypeChange}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={4}>
              <Button
                block
                className="app-filter__clear"
                onClick={() => {
                  setKeyword("");
                  setBillingType(undefined);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                Xóa lọc
              </Button>
            </Col>
          </Row>
        </MyCard>

        {/* SERVICE TABLE */}
        <MyCard title="Danh sách dịch vụ">
          <CommonTable
            columns={columns}
            dataSource={services.items}
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: services.totalItems,
            }}
            onPageChange={handlePageChange}
            emptyText="Chưa có dịch vụ nào"
            totalText="dịch vụ"
          />
        </MyCard>
      </Flex>

      {/* SERVICE FORM */}
      <ServiceForm
        isMode={open.isMode}
        record={open.record || {}}
        isModal={open.isModal}
        hideModal={hideModal}
        fetchServices={fetchServices}
        setLoading={setLoading}
        notify={notify}
      />
    </>
  );
};

export default ServicePage;
