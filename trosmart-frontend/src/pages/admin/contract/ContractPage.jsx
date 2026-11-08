import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, Col, Flex, Input, Row, Tooltip, Typography } from "antd";
import {
  EyeOutlined,
  FileTextOutlined,
  FormOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getContracts, getContractDashboard } from "../../../api/contractApi";
import { getBuildingOptions } from "../../../api/buildingApi";

import MyCard from "../../../components/MyCard";
import { useNotify } from "../../../components/NotificationProvider";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";
import CommonStatisticCards from "../../../components/CommonStatisticCards";
import CommonSelect from "../../../components/CommonSelect";
import { formatCurrency } from "../../../utils/format-currency";
import { path_name } from "../../../constants/path_name";
import "../../../assets/style/FilterBar.css";
import "./ContractPage.css";

const { Text } = Typography;

const CONTRACT_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Bản nháp" },
  { value: "ACTIVE", label: "Đang hiệu lực" },
  { value: "EXPIRED", label: "Đã hết hạn" },
  { value: "TERMINATED", label: "Đã chấm dứt" },
];

// Màu chấm + nền của trạng thái hợp đồng (cùng kiểu trang phòng)
const STATUS_TONE_MAP = {
  DRAFT: "gray",
  ACTIVE: "green",
  EXPIRED: "orange",
  TERMINATED: "red",
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN");
};

const ContractPage = () => {
  const { notify, contextHolder } = useNotify();
  const navigate = useNavigate();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // =========================
  // FILTERS
  // =========================
  const [filters, setFilters] = useState({
    keyword: "",
    status: undefined,
    buildingId: undefined,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  // =========================
  // DATA
  // =========================

  const [contracts, setContracts] = useState({
    items: [],
    totalItems: 0,
  });

  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(false);

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  // =========================
  // LOAD CONTRACTS
  // =========================
  const fetchContracts = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        keyword: filters.keyword.trim() || undefined,
        status: filters.status || undefined,
        buildingId: filters.buildingId || undefined,
        page: pagination.page,
        size: pagination.size,
      };

      const data = await getContracts(params);

      setContracts({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      setContracts({
        items: [],
        totalItems: 0,
      });

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách hợp đồng",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    filters.keyword,
    filters.status,
    filters.buildingId,
    pagination.page,
    pagination.size,
  ]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // =========================
  // LOAD DASHBOARD
  // =========================
  const loadDashboard = useCallback(async () => {
    try {
      const data = await getContractDashboard();
      setDashboard(data ?? {});
    } catch (error) {
      console.error("Lấy thống kê hợp đồng thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể tải thống kê hợp đồng",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // =========================
  // LOAD BUILDINGS
  // =========================
  const fetchBuildings = useCallback(async () => {
    setBuildingsLoading(true);

    try {
      const data = await getBuildingOptions();
      setBuildings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lấy danh sách tòa nhà thất bại:", error);

      setBuildings([]);

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách tòa nhà",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setBuildingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  // =========================
  // FILTER HANDLERS
  // =========================
  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      keyword: "",
      status: undefined,
      buildingId: undefined,
    });

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // =========================
  // NAVIGATE ADD / DETAIL
  // =========================
  const handleAddContract = () => {
    navigate(`${path_name.contract}/them-moi`);
  };

  const handleViewContract = (record) => {
    if (!record?.id) return;

    navigate(`${path_name.contract}/${record.id}`);
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      title: "Mã hợp đồng",
      dataIndex: "contractCode",
      key: "contractCode",
      width: 150,
      render: (value) => <Text strong>{value || "—"}</Text>,
    },
    {
      title: "Phòng cho thuê",
      key: "roomBuilding",
      width: 160,
      ellipsis: true,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.roomNumber || "—"}</div>
          <div style={{ fontSize: 12, color: "#8c8c8c" }}>
            {record.buildingName || "—"}
          </div>
        </div>
      ),
    },
    {
      title: "Người đại diện",
      dataIndex: "tenantName",
      key: "tenantName",
      width: 160,
      render: (value, record) => (
        <Flex vertical gap={2}>
          <Text>{value || "—"}</Text>
          {record.tenantPhone && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.tenantPhone}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "startDate",
      key: "startDate",
      width: 120,
      render: formatDate,
    },
    {
      title: "Ngày kết thúc",
      dataIndex: "endDate",
      key: "endDate",
      width: 120,
      render: formatDate,
    },
    {
      title: "Giá thuê",
      dataIndex: "rentPrice",
      key: "rentPrice",
      width: 140,
      render: (value) =>
        value != null ? (
          <Text style={{ fontWeight: 500, fontSize: 12 }}>
            {formatCurrency(value, true)}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Tiền đặt cọc",
      dataIndex: "deposit",
      key: "deposit",
      width: 150,
      render: (value) =>
        value != null ? (
          <Text style={{ color: "#eb471a", fontWeight: 500, fontSize: 12 }}>
            {formatCurrency(value, true)}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 145,
      render: (value) => {
        const option = CONTRACT_STATUS_OPTIONS.find(
          (item) => item.value === value,
        );

        return (
          <span
            className={`ct-pill ct-pill--${STATUS_TONE_MAP[value] || "gray"}`}
          >
            <i />
            {option?.label || value || "—"}
          </span>
        );
      },
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
            aria-label={`Xem chi tiết hợp đồng ${record.contractCode}`}
            onClick={() => handleViewContract(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // =========================
  // STATISTICS
  // =========================
  const statisticCards = [
    {
      key: "total",
      title: "Tổng hợp đồng",
      value: dashboard.totalContracts ?? 0,
      description: "Tổng số hợp đồng trong hệ thống",
      icon: <FileTextOutlined />,
      color: "#536ee7",
      background: "#eef1ff",
    },
    {
      key: "active",
      title: "Đang hiệu lực",
      value: dashboard.activeContracts ?? 0,
      description: "Hợp đồng đang có hiệu lực",
      icon: <CheckCircleOutlined />,
      color: "#16a34a",
      background: "#eaf8ef",
    },
    {
      key: "draft",
      title: "Bản nháp",
      value: dashboard.draftContracts ?? 0,
      description: "Hợp đồng chưa đến ngày bắt đầu",
      icon: <FormOutlined />,
      color: "#d97706",
      background: "#fff7e8",
    },
    {
      key: "expiring",
      title: "Sắp hết hạn",
      value: dashboard.expiringContracts ?? 0,
      description: "Hợp đồng hết hạn trong 30 ngày tới",
      icon: <ClockCircleOutlined />,
      color: "#dc2626",
      background: "#fff0f0",
    },
  ];

  // =========================
  // RENDER
  // =========================
  return (
    <Fragment>
      {contextHolder}

      <PageHeader
        title="Quản lý hợp đồng"
        description="Theo dõi thời hạn, giá thuê và trạng thái hợp đồng thuê phòng."
        buttonText="Thêm hợp đồng"
        onButtonClick={handleAddContract}
      />

      <Flex vertical gap={20}>
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            <Col xs={24} md={12} xl={12}>
              <Input
                allowClear
                value={filters.keyword}
                placeholder="Tìm mã hợp đồng hoặc mã phòng..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                onChange={(event) =>
                  updateFilter("keyword", event.target.value)
                }
              />
            </Col>

            <Col xs={24} sm={12} xl={5}>
              <CommonSelect
                placeholder="Chọn tòa nhà"
                value={filters.buildingId}
                loading={buildingsLoading}
                options={buildings.map((building) => ({
                  value: building.id,
                  label: building.name,
                }))}
                onChange={(value) => updateFilter("buildingId", value)}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} xl={5}>
              <CommonSelect
                placeholder="Trạng thái hợp đồng"
                value={filters.status}
                options={CONTRACT_STATUS_OPTIONS}
                onChange={(value) => updateFilter("status", value)}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} xl={2}>
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

        <MyCard title="Danh sách hợp đồng">
          <CommonTable
            columns={columns}
            dataSource={contracts.items}
            rowKey="id"
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: contracts.totalItems,
            }}
            onPageChange={(page, size) => {
              setPagination({ page, size });
            }}
            emptyText="Chưa có hợp đồng nào"
            totalText="hợp đồng"
          />
        </MyCard>
      </Flex>
    </Fragment>
  );
};

export default ContractPage;
