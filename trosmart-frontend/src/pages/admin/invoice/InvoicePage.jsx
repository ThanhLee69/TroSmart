import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, Col, Flex, Input, Row, Tooltip } from "antd";
import {
  CheckCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { generatePath, useNavigate } from "react-router-dom";
import { getInvoiceDashboard, getInvoices } from "../../../api/invoiceApi";
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
import "./InvoicePage.css";

const KEYWORD_DEBOUNCE_MS = 400;

const INVOICE_STATUS_OPTIONS = [
  { value: "UNPAID", label: "Chưa thanh toán" },
  { value: "PARTIALLY_PAID", label: "Thanh toán một phần" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "OVERDUE", label: "Quá hạn" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

// Năm hiện tại và 4 năm trước (không lập hóa đơn cho kỳ ở tương lai)
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => ({
  value: CURRENT_YEAR - index,
  label: `Năm ${CURRENT_YEAR - index}`,
}));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN");
};

const formatPeriod = (month, year) =>
  `${String(month).padStart(2, "0")}/${year}`;

// Trạng thái: dấu chấm + nền màu nhạt (màu theo class ivl-status--*)
const renderStatus = (value) => {
  const option = INVOICE_STATUS_OPTIONS.find((item) => item.value === value);

  return (
    <span className={`ivl-status ivl-status--${value || "CANCELLED"}`}>
      <span className="ivl-status__dot" />
      {option?.label || value || "—"}
    </span>
  );
};

// Số tiền: mỗi loại một màu, bằng 0 thì mờ đi
const renderMoney = (value, tone) =>
  value == null ? (
    "—"
  ) : (
    <span className={`ivl-money ivl-money--${tone}`}>
      {formatCurrency(value, true)}
    </span>
  );

const INITIAL_FILTERS = {
  keyword: "",
  buildingId: undefined,
  billingMonth: CURRENT_MONTH,
  billingYear: CURRENT_YEAR,
  status: undefined,
};

const InvoicePage = () => {
  const { notify, contextHolder } = useNotify();
  const navigate = useNavigate();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // =========================
  // FILTERS
  // =========================
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Ô tìm kiếm gõ tới đâu giữ tới đó, sau 400ms mới đưa vào bộ lọc để gọi API
  const [keywordInput, setKeywordInput] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  // =========================
  // DATA
  // =========================
  const [invoices, setInvoices] = useState({
    items: [],
    totalItems: 0,
  });

  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(false);

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  // =========================
  // LOAD INVOICES
  // =========================
  const fetchInvoices = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        keyword: filters.keyword.trim() || undefined,
        buildingId: filters.buildingId || undefined,
        billingMonth: filters.billingMonth || undefined,
        billingYear: filters.billingYear || undefined,
        status: filters.status || undefined,
        page: pagination.page,
        size: pagination.size,
      };

      const data = await getInvoices(params);

      setInvoices({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      setInvoices({
        items: [],
        totalItems: 0,
      });

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách hóa đơn",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    filters.keyword,
    filters.buildingId,
    filters.billingMonth,
    filters.billingYear,
    filters.status,
    pagination.page,
    pagination.size,
  ]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // =========================
  // LOAD DASHBOARD
  // Thống kê bắt buộc có tháng và năm: nếu đang bỏ chọn thì dùng kỳ hiện tại
  // =========================
  const dashboardMonth = filters.billingMonth || CURRENT_MONTH;
  const dashboardYear = filters.billingYear || CURRENT_YEAR;

  const loadDashboard = useCallback(async () => {
    try {
      const data = await getInvoiceDashboard({
        buildingId: filters.buildingId || undefined,
        billingMonth: dashboardMonth,
        billingYear: dashboardYear,
      });

      setDashboard(data ?? {});
    } catch (error) {
      console.error("Lấy thống kê hóa đơn thất bại:", error);

      setDashboard({});

      notifyRef.current({
        type: "error",
        message: "Không thể tải thống kê hóa đơn",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  }, [filters.buildingId, dashboardMonth, dashboardYear]);

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
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  }, []);

  // Debounce ô tìm kiếm
  useEffect(() => {
    if (keywordInput === filters.keyword) return undefined;

    const timer = setTimeout(() => {
      updateFilter("keyword", keywordInput);
    }, KEYWORD_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [keywordInput, filters.keyword, updateFilter]);

  const clearFilters = () => {
    setKeywordInput("");
    setFilters(INITIAL_FILTERS);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // =========================
  // NAVIGATE CREATE / DETAIL
  // =========================
  const handleAddInvoice = () => {
    navigate(path_name.invoiceCreate);
  };

  const handleViewInvoice = (record) => {
    if (!record?.id) return;

    navigate(generatePath(path_name.invoiceDetail, { invoiceId: record.id }));
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      title: "Mã hóa đơn",
      dataIndex: "invoiceCode",
      key: "invoiceCode",
      width: 160,
      render: (value, record) => (
        <button
          type="button"
          className="ivl-code"
          onClick={() => handleViewInvoice(record)}
          aria-label={`Xem hóa đơn ${value}`}
        >
          {value || "—"}
        </button>
      ),
    },
    {
      title: "Phòng",
      key: "roomBuilding",
      width: 150,
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
      title: "Khách thuê",
      dataIndex: "tenantName",
      key: "tenantName",
      width: 140,
      ellipsis: true,
      render: (value) => value || "—",
    },
    {
      title: "Kỳ",
      key: "period",
      width: 90,
      align: "center",
      render: (_, record) =>
        record.billingMonth && record.billingYear ? (
          <span className="ivl-period">
            {formatPeriod(record.billingMonth, record.billingYear)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      title: "Hạn thanh toán",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 130,
      render: formatDate,
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      width: 130,
      render: (value) => renderMoney(value, "total"),
    },
    {
      title: "Đã thanh toán",
      dataIndex: "paidAmount",
      key: "paidAmount",
      width: 130,
      render: (value) => renderMoney(value, Number(value) > 0 ? "ok" : "zero"),
    },
    {
      title: "Còn lại",
      dataIndex: "remainingAmount",
      key: "remainingAmount",
      width: 130,
      render: (value, record) => {
        let tone = "zero";

        if (record.status !== "CANCELLED" && Number(value) > 0) {
          tone = record.status === "OVERDUE" ? "danger" : "warn";
        }

        return renderMoney(value, tone);
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 175,
      render: renderStatus,
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
            className="ivl-action"
            icon={<EyeOutlined />}
            onClick={() => handleViewInvoice(record)}
            aria-label={`Xem chi tiết hóa đơn ${record.invoiceCode}`}
          />
        </Tooltip>
      ),
    },
  ];

  // =========================
  // STATISTICS (theo kỳ đang lọc)
  // =========================
  const periodText = `Kỳ ${formatPeriod(dashboardMonth, dashboardYear)}`;

  const statisticCards = [
    {
      key: "total",
      title: "Tổng phải thu",
      value: formatCurrency(dashboard.totalAmount ?? 0, true),
      description: `${periodText} · ${dashboard.invoiceCount ?? 0} hóa đơn`,
      icon: <FileTextOutlined />,
      color: "#536ee7",
      background: "#eef1ff",
    },
    {
      key: "paid",
      title: "Đã thu",
      value: formatCurrency(dashboard.paidAmount ?? 0, true),
      description: `${periodText} · tiền đã thanh toán`,
      icon: <CheckCircleOutlined />,
      color: "#16a34a",
      background: "#eaf8ef",
    },
    {
      key: "remaining",
      title: "Còn nợ",
      value: formatCurrency(dashboard.remainingAmount ?? 0, true),
      description: `${periodText} · tiền chưa thanh toán`,
      icon: <DollarOutlined />,
      color: "#d97706",
      background: "#fff7e8",
    },
    {
      key: "overdue",
      title: "Quá hạn",
      value: dashboard.overdueCount ?? 0,
      description: `${periodText} · hóa đơn quá hạn`,
      icon: <WarningOutlined />,
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
        title="Quản lý hóa đơn"
        description="Theo dõi hóa đơn tiền phòng, điện nước, dịch vụ và tình trạng thanh toán."
        buttonText="Lập hóa đơn"
        onButtonClick={handleAddInvoice}
      />

      <Flex vertical gap={20}>
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            <Col xs={24} md={12} xl={8}>
              <Input
                allowClear
                value={keywordInput}
                placeholder="Tìm mã hóa đơn hoặc mã phòng..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </Col>

            <Col xs={12} md={6} xl={3}>
              <CommonSelect
                allowClear
                placeholder="Tháng"
                value={filters.billingMonth}
                options={MONTH_OPTIONS}
                onChange={(value) => updateFilter("billingMonth", value)}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={12} md={6} xl={3}>
              <CommonSelect
                allowClear
                placeholder="Năm"
                value={filters.billingYear}
                options={YEAR_OPTIONS}
                onChange={(value) => updateFilter("billingYear", value)}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} xl={4}>
              <CommonSelect
                allowClear
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

            <Col xs={24} sm={12} xl={4}>
              <CommonSelect
                allowClear
                placeholder="Trạng thái"
                value={filters.status}
                options={INVOICE_STATUS_OPTIONS}
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

        <MyCard title="Danh sách hóa đơn">
          <CommonTable
            columns={columns}
            dataSource={invoices.items}
            rowKey="id"
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: invoices.totalItems,
            }}
            onPageChange={(page, size) => {
              setPagination({ page, size });
            }}
            emptyText="Chưa có hóa đơn nào"
            totalText="hóa đơn"
          />
        </MyCard>
      </Flex>
    </Fragment>
  );
};

export default InvoicePage;
