import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Flex,
  Input,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
  Grid,
  Select,
  Col,
  Row,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  ClearOutlined,
} from "@ant-design/icons";

import MyCard from "../../../components/MyCard";
import CommonTable from "../../../components/CommonTable";
import PageHeader from "../../../components/PageHeader";
import CommonSelect from "../../../components/CommonSelect";
import { useNotify } from "../../../components/NotificationProvider";
import "../../../assets/style/FilterBar.css";

import {
  getTenantVehicles,
  deleteTenantVehicle,
  getAvailableTenants,
} from "../../../api/tenantVehicleApi";

import TenantVehicleForm from "./TenantVehicleForm";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const vehicleTypeConfig = {
  MOTORBIKE: { color: "blue", text: "Xe máy" },
  ELECTRIC_BICYCLE: { color: "cyan", text: "Xe đạp điện" },
  BICYCLE: { color: "green", text: "Xe đạp" },
  CAR: { color: "purple", text: "Ô tô" },
  OTHER: { color: "default", text: "Khác" },
};

const vehicleTypeOptions = Object.entries(vehicleTypeConfig).map(
  ([value, config]) => ({
    value,
    label: config.text,
  }),
);

const TenantVehiclePage = ({ tenantId: initialTenantId }) => {
  const { notify, contextHolder } = useNotify();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const requestIdRef = useRef(0);

  // KHÁCH THUÊ
  const [selectedTenantId, setSelectedTenantId] = useState(
    initialTenantId ?? undefined,
  );
  const [tenantOptions, setTenantOptions] = useState([]);
  const [tenantLoading, setTenantLoading] = useState(false);

  // DANH SÁCH PHƯƠNG TIỆN
  const [vehicles, setVehicles] = useState({
    items: [],
    totalItems: 0,
  });

  // TÌM KIẾM VÀ LỌC
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [vehicleType, setVehicleType] = useState(undefined);

  // PHÂN TRANG
  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  const [loading, setLoading] = useState(false);

  // MODAL
  const [open, setOpen] = useState({
    isModal: false,
    isMode: "create",
    record: null,
  });

  // TẢI DANH SÁCH KHÁCH THUÊ
  useEffect(() => {
    let cancelled = false;

    const fetchTenants = async () => {
      try {
        setTenantLoading(true);

        const response = await getAvailableTenants();

        if (cancelled) return;

        const items = Array.isArray(response)
          ? response
          : response?.items ||
            response?.content ||
            response?.result?.items ||
            response?.result ||
            [];

        setTenantOptions(
          items.map((tenant) => ({
            value: tenant.id,
            label: `${tenant.fullName || tenant.name || "Khách thuê"}${
              tenant.phone ? ` - ${tenant.phone}` : ""
            }`,
          })),
        );
      } catch (error) {
        if (cancelled) return;

        console.error("Get tenants error:", error);

        notifyRef.current({
          type: "error",
          message: "Lỗi tải khách thuê",
          description:
            error?.response?.data?.message ||
            "Không thể tải danh sách khách thuê.",
        });
      } finally {
        if (!cancelled) {
          setTenantLoading(false);
        }
      }
    };

    fetchTenants();

    return () => {
      cancelled = true;
    };
  }, []);

  // ĐỒNG BỘ KHÁCH THUÊ TỪ TRANG CHA
  useEffect(() => {
    setSelectedTenantId(initialTenantId ?? undefined);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [initialTenantId]);

  // DEBOUNCE TÌM KIẾM
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [keyword]);

  // TẢI DANH SÁCH PHƯƠNG TIỆN
  const fetchVehicles = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      const params = {
        keyword: debouncedKeyword || undefined,
        vehicleType: vehicleType || undefined,
        page: pagination.page,
        size: pagination.size,
      };

      // Không chọn khách thuê thì lấy tất cả phương tiện.
      if (selectedTenantId != null) {
        params.tenantId = selectedTenantId;
      }

      const data = await getTenantVehicles(params);

      // Bỏ qua kết quả của request cũ.
      if (requestId !== requestIdRef.current) return;

      const result = data?.result ?? data;

      const items = Array.isArray(result)
        ? result
        : result?.items || result?.content || [];

      setVehicles({
        items,
        totalItems: result?.totalItems ?? result?.totalElements ?? items.length,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      console.error("Get tenant vehicles error:", error);

      notifyRef.current({
        type: "error",
        message: "Lỗi tải dữ liệu",
        description:
          error?.response?.data?.message ||
          "Không thể tải danh sách phương tiện.",
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    selectedTenantId,
    debouncedKeyword,
    vehicleType,
    pagination.page,
    pagination.size,
  ]);

  useEffect(() => {
    fetchVehicles();

    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchVehicles]);

  // CHỌN KHÁCH THUÊ
  const handleTenantChange = (value) => {
    setSelectedTenantId(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // TÌM KIẾM
  const handleKeywordChange = (event) => {
    setKeyword(event.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // LỌC LOẠI PHƯƠNG TIỆN
  const handleVehicleTypeChange = (value) => {
    setVehicleType(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // XÓA BỘ LỌC
  const handleClearFilters = () => {
    setKeyword("");
    setDebouncedKeyword("");
    setVehicleType(undefined);
    setSelectedTenantId(undefined);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // PHÂN TRANG
  const handlePageChange = (page, pageSize) => {
    setPagination({
      page,
      size: pageSize,
    });
  };

  // MỞ MODAL
  const showModal = (isMode, record = null) => {
    setOpen({
      isModal: true,
      isMode,
      record,
    });
  };

  // ĐÓNG MODAL
  const hideModal = () => {
    setOpen({
      isModal: false,
      isMode: "create",
      record: null,
    });
  };

  // XÓA PHƯƠNG TIỆN
  const handleDelete = async (id) => {
    try {
      await deleteTenantVehicle(id);

      notifyRef.current({
        type: "success",
        message: "Xóa thành công!",
        description: "Đã xóa phương tiện khỏi hệ thống.",
      });

      if (vehicles.items.length === 1 && pagination.page > 1) {
        setPagination((prev) => ({
          ...prev,
          page: prev.page - 1,
        }));
      } else {
        await fetchVehicles();
      }
    } catch (error) {
      console.error("Delete tenant vehicle error:", error);

      notifyRef.current({
        type: "error",
        message: "Xóa thất bại!",
        description:
          error?.response?.data?.message || "Không thể xóa phương tiện.",
      });
    }
  };
  const vehicleTypeConfig = {
    MOTORBIKE: {
      text: "Xe máy",
      dotColor: "#536ee7",
      bgColor: "#f0f3ff",
    },
    ELECTRIC_BICYCLE: {
      text: "Xe đạp điện",
      dotColor: "#13a8a8",
      bgColor: "#e6f7f7",
    },
    BICYCLE: {
      text: "Xe đạp",
      dotColor: "#389e5a",
      bgColor: "#edf8f0",
    },
  };
  // CỘT BẢNG
  const columns = [
    {
      title: "Chủ phương tiện",
      dataIndex: "tenantName",
      key: "tenantName",
      width: 140,
      render: (value) => <Text strong>{value || "—"}</Text>,
    },
    {
      title: "Loại xe",
      dataIndex: "vehicleType",
      key: "vehicleType",
      width: 130,
      render: (value) => {
        const config = vehicleTypeConfig[value];

        if (!config) return <Text type="secondary">—</Text>;

        return (
          <Space size={7}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: config.dotColor,
                display: "inline-block",
              }}
            />
            <span>{config.text}</span>
          </Space>
        );
      },
    },
    {
      title: "Biển số xe",
      dataIndex: "licensePlate",
      key: "licensePlate",
      width: 160,
      render: (value) => <Text type="danger">{value || "—"}</Text>,
    },
    {
      title: "Hãng xe / Model",
      key: "brand",
      width: 140,
      render: (_, record) => {
        const value = record.brand || record.model;

        return value || <Text type="secondary">Chưa cập nhật</Text>;
      },
    },
    {
      title: "Màu xe",
      dataIndex: "color",
      key: "color",
      width: 120,
      render: (value) => value || <Text type="secondary">Chưa cập nhật</Text>,
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 220,
      render: (value) => {
        if (!value) {
          return <Text type="secondary">Không có ghi chú</Text>;
        }

        return (
          <Tooltip title={value}>
            <span
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {value}
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
              aria-label={`Chỉnh sửa xe ${record.licensePlate || ""}`}
            />
          </Tooltip>

          <Popconfirm
            title="Xóa phương tiện?"
            description="Bạn có chắc chắn muốn xóa phương tiện này?"
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
                aria-label={`Xóa xe ${record.licensePlate || ""}`}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <PageHeader
        title="Quản lý phương tiện"
        description="Quản lý các phương tiện đăng ký của khách thuê."
        buttonText="Thêm phương tiện"
        onButtonClick={() => showModal("create")}
      />

      <Flex vertical gap={20}>
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[12, 12]} className="app-filter">
            {/* TÌM KIẾM */}
            <Col xs={24} md={24} xl={13}>
              <Input
                allowClear
                style={{ width: "100%" }}
                placeholder="Tìm biển số, hãng xe hoặc màu xe..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                value={keyword}
                onChange={handleKeywordChange}
              />
            </Col>

            {/* KHÁCH THUÊ */}
            <Col xs={24} sm={12} md={12} xl={5}>
              <CommonSelect
                style={{ width: "100%" }}
                options={tenantOptions}
                value={selectedTenantId}
                onChange={handleTenantChange}
                loading={tenantLoading}
                placeholder="Tất cả khách thuê"
                showSearch
                allowClear
                optionFilterProp="label"
              />
            </Col>

            {/* LOẠI PHƯƠNG TIỆN */}
            <Col xs={24} sm={12} md={12} xl={4}>
              <Select
                style={{ width: "100%" }}
                placeholder="Tất cả loại xe"
                allowClear
                value={vehicleType}
                onChange={handleVehicleTypeChange}
                options={vehicleTypeOptions}
              />
            </Col>

            {/* XÓA LỌC */}
            <Col xs={24} sm={24} md={12} xl={2}>
              <Button
                block
                onClick={handleClearFilters}
                className="app-filter__clear"
              >
                Xóa lọc
              </Button>
            </Col>
          </Row>
        </MyCard>

        <MyCard title="Danh sách phương tiện">
          <CommonTable
            columns={columns}
            dataSource={vehicles.items}
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: vehicles.totalItems,
            }}
            onPageChange={handlePageChange}
            emptyText={"Không tìm thấy phương tiện phù hợp"}
            totalText="phương tiện"
          />
        </MyCard>
      </Flex>

      <TenantVehicleForm
        isMode={open.isMode}
        record={open.record || {}}
        isModal={open.isModal}
        hideModal={hideModal}
        fetchVehicles={fetchVehicles}
        setLoading={setLoading}
        notify={notify}
        tenantId={selectedTenantId}
      />
    </>
  );
};

export default TenantVehiclePage;
