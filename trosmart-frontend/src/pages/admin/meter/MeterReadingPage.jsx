import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Button, Col, Flex, Grid, Input, Row, Tooltip, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  ExperimentOutlined,
  FormOutlined,
  LockOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getMeterReadingById,
  getMeterReadingDashboard,
  getMeterReadings,
} from "../../../api/meterReadingApi";
import { getBuildingOptions } from "../../../api/buildingApi";
import { path_name } from "../../../constants/path_name";

import MyCard from "../../../components/MyCard";
import { useNotify } from "../../../components/NotificationProvider";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";
import CommonStatisticCards from "../../../components/CommonStatisticCards";
import CommonSelect from "../../../components/CommonSelect";
import MeterReadingForm from "./MeterReadingForm";
import "../../../assets/style/FilterBar.css";
import "./MeterReadingPage.css";
const { Text } = Typography;
const { useBreakpoint } = Grid;

// =========================
// CONSTANTS
// =========================
const STATUS_OPTIONS = [
  { value: "NOT_RECORDED", label: "Chưa ghi" },
  { value: "RECORDED", label: "Đã ghi" },
  { value: "INVOICED", label: "Đã lập hóa đơn" },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const CURRENT_YEAR = dayjs().year();

// Từ 3 năm trước đến năm sau
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => {
  const year = CURRENT_YEAR - 3 + index;
  return { value: year, label: `Năm ${year}` };
});

// =========================
// HELPERS
// =========================
const formatNumber = (value) => {
  if (value === null || value === undefined) return "—";

  const number = Number(value);
  if (Number.isNaN(number)) return "—";

  return number.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN");
};

// Trạng thái: dấu chấm + nền màu nhạt (màu theo class mtr-status--*)
const renderStatus = (value) => {
  const option = STATUS_OPTIONS.find((item) => item.value === value);

  return (
    <span className={`mtr-status mtr-status--${value || "NOT_RECORDED"}`}>
      <span className="mtr-status__dot" />
      {option?.label || value || "—"}
    </span>
  );
};

// Màu cột điện (vàng) và nước (xanh) giống thẻ thống kê / form nhập
const ELECTRIC_TONE = { head: "#f9ddb0", cell: "#fbede1", text: "#8a5500" };
const WATER_TONE = { head: "#d4e2f5", cell: "#e8f0fb", text: "#0f336c" };

// Gắn màu nền cho tiêu đề và ô của một nhóm cột
const withTone = (columns, tone) =>
  columns.map((column) => ({
    ...column,
    onHeaderCell: () => ({
      style: { background: tone.head, color: tone.text },
    }),
    onCell: () => ({ style: { background: tone.cell } }),
  }));

// Chỉ hiện lượng tiêu thụ khi đã có chỉ số cuối
const formatConsumption = (consumption, endValue, color) =>
  endValue === null || endValue === undefined ? (
    "—"
  ) : (
    <Text strong style={{ color }}>
      {formatNumber(consumption)}
    </Text>
  );

// Cột điện + nước của bảng danh sách
const buildMeterColumns = () => [
  {
    title: "Điện (kWh)",
    onHeaderCell: () => ({
      style: {
        background: ELECTRIC_TONE.head,
        color: ELECTRIC_TONE.text,
        textAlign: "center",
      },
    }),
    children: withTone(
      [
        {
          title: "Đầu kỳ",
          dataIndex: "electricityStart",
          key: "electricityStart",
          width: 80,
          render: formatNumber,
        },
        {
          title: "Cuối kỳ",
          dataIndex: "electricityEnd",
          key: "electricityEnd",
          width: 80,
          render: formatNumber,
        },
        {
          title: "Tiêu thụ",
          dataIndex: "electricityConsumption",
          key: "electricityConsumption",
          width: 80,
          render: (value, record) =>
            formatConsumption(value, record.electricityEnd, ELECTRIC_TONE.text),
        },
      ],
      ELECTRIC_TONE,
    ),
  },
  {
    title: "Nước (m³)",
    onHeaderCell: () => ({
      style: {
        background: WATER_TONE.head,
        color: WATER_TONE.text,
        textAlign: "center",
      },
    }),
    children: withTone(
      [
        {
          title: "Đầu kỳ",
          dataIndex: "waterStart",
          key: "waterStart",
          width: 80,
          render: formatNumber,
        },
        {
          title: "Cuối kỳ",
          dataIndex: "waterEnd",
          key: "waterEnd",
          width: 80,
          render: formatNumber,
        },
        {
          title: "Tiêu thụ",
          dataIndex: "waterConsumption",
          key: "waterConsumption",
          width: 80,
          render: (value, record) =>
            formatConsumption(value, record.waterEnd, WATER_TONE.text),
        },
      ],
      WATER_TONE,
    ),
  },
];

const MeterReadingPage = () => {
  const { notify, contextHolder } = useNotify();
  const navigate = useNavigate();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // =========================
  // FILTERS
  // Tháng + năm là bắt buộc nên mặc định là kỳ hiện tại
  // =========================
  const getDefaultFilters = () => ({
    buildingId: undefined,
    billingMonth: dayjs().month() + 1,
    billingYear: dayjs().year(),
    status: undefined,
    keyword: "",
  });

  const [filters, setFilters] = useState(getDefaultFilters);

  // Ô tìm kiếm gõ tới đâu hiện tới đó, nhưng chỉ gọi API sau khi ngừng gõ 400ms
  const [keywordInput, setKeywordInput] = useState("");
  const screens = useBreakpoint();

  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  // =========================
  // DATA
  // =========================
  const [readings, setReadings] = useState({
    items: [],
    totalItems: 0,
  });

  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(false);

  const [buildings, setBuildings] = useState([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  // Form ghi / sửa chỉ số (MeterReadingForm)
  const [open, setOpen] = useState({
    isModal: false,
    isMode: "",
    record: null,
  });
  const [openingId, setOpeningId] = useState(null);

  // =========================
  // LOAD READINGS
  // =========================
  const fetchReadings = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getMeterReadings({
        buildingId: filters.buildingId,
        billingMonth: filters.billingMonth,
        billingYear: filters.billingYear,
        status: filters.status,
        keyword: filters.keyword || undefined,
        page: pagination.page,
        size: pagination.size,
      });

      setReadings({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      setReadings({ items: [], totalItems: 0 });

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách điện nước",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    filters.buildingId,
    filters.billingMonth,
    filters.billingYear,
    filters.status,
    filters.keyword,
    pagination.page,
    pagination.size,
  ]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  // =========================
  // LOAD DASHBOARD
  // =========================
  const loadDashboard = useCallback(async () => {
    try {
      const data = await getMeterReadingDashboard({
        buildingId: filters.buildingId,
        billingMonth: filters.billingMonth,
        billingYear: filters.billingYear,
      });

      setDashboard(data ?? {});
    } catch (error) {
      console.error("Lấy thống kê điện nước thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể tải thống kê điện nước",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  }, [filters.buildingId, filters.billingMonth, filters.billingYear]);

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

  // Debounce ô tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      const keyword = keywordInput.trim();

      setFilters((prev) =>
        prev.keyword === keyword ? prev : { ...prev, keyword },
      );

      setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }, 400);

    return () => clearTimeout(timer);
  }, [keywordInput]);

  const clearFilters = () => {
    setKeywordInput("");
    setFilters(getDefaultFilters());

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // =========================
  // GHI / SỬA CHỈ SỐ
  // =========================
  const refreshData = async () => {
    await fetchReadings();
    await loadDashboard();
  };

  const showModal = (mode, record = null) => {
    setOpen({ isModal: true, isMode: mode, record });
  };

  const hideModal = () => {
    setOpen({ isModal: false, isMode: "", record: null });
  };

  const openForm = async (record) => {
    // Phòng chưa có bản ghi: mở form tạo mới
    if (!record?.id) {
      showModal("create", record);
      return;
    }

    // Đã có bản ghi: lấy dữ liệu mới nhất trước khi sửa
    setOpeningId(record.id);

    try {
      const detail = await getMeterReadingById(record.id);
      showModal("edit", detail);
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: "Không thể tải bản ghi điện nước",
        description:
          error?.response?.data?.message ||
          "Bản ghi có thể đã bị xóa, vui lòng tải lại trang.",
      });

      await fetchReadings();
    } finally {
      setOpeningId(null);
    }
  };

  // =========================
  // CHI TIẾT THEO PHÒNG
  // Truyền cả dòng của bảng qua state để phòng chưa có bản ghi vẫn hiện đủ thông tin
  // =========================
  const openDetail = (record) => {
    navigate(`/quan-tri/dien-nuoc/phong/${record.roomId}`, {
      state: { record },
    });
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      title: "Phòng",
      key: "room",
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

    ...buildMeterColumns(),
    {
      title: "Ngày ghi",
      dataIndex: "recordedDate",
      key: "recordedDate",
      width: 115,
      align: "center",
      render: formatDate,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: renderStatus,
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right",
      width: 96,
      align: "center",
      render: (_, record) => {
        const hasReading = Boolean(record.id);
        const locked = record.status === "INVOICED";
        const editLabel = hasReading ? "Cập nhật chỉ số" : "Ghi chỉ số";

        return (
          <div className="mtr-actions">
            <Tooltip title="Xem chi tiết">
              <Button
                type="text"
                className="mtr-action"
                icon={<EyeOutlined />}
                onClick={() => openDetail(record)}
                aria-label={`Xem chi tiết phòng ${record.roomNumber}`}
              />
            </Tooltip>

            {locked ? (
              // Đã lập hóa đơn: khóa ghi / sửa. Bọc span để tooltip hiện được trên nút bị vô hiệu
              <Tooltip title="Đã lập hóa đơn, không thể sửa chỉ số">
                <span className="mtr-action-wrap">
                  <Button
                    type="text"
                    className="mtr-action"
                    icon={<LockOutlined />}
                    disabled
                    aria-label={`Phòng ${record.roomNumber} đã lập hóa đơn`}
                  />
                </span>
              </Tooltip>
            ) : (
              <Tooltip title={editLabel}>
                <Button
                  type="text"
                  className="mtr-action mtr-action--primary"
                  icon={hasReading ? <EditOutlined /> : <FormOutlined />}
                  loading={openingId !== null && openingId === record.id}
                  disabled={openingId !== null && openingId !== record.id}
                  onClick={() => openForm(record)}
                  aria-label={`${editLabel} phòng ${record.roomNumber}`}
                />
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  // =========================
  // STATISTICS
  // =========================
  const statisticCards = [
    {
      key: "electricity",
      title: "Điện tiêu thụ",
      value: `${formatNumber(dashboard.totalElectricityConsumption ?? 0)} kWh`,
      description: "Tổng điện của các phòng đã ghi trong kỳ",
      icon: <ThunderboltOutlined />,
      color: "#d97706",
      background: "#fff7e8",
    },
    {
      key: "water",
      title: "Nước tiêu thụ",
      value: `${formatNumber(dashboard.totalWaterConsumption ?? 0)} m³`,
      description: "Tổng nước của các phòng đã ghi trong kỳ",
      icon: <ExperimentOutlined />,
      color: "#536ee7",
      background: "#eef1ff",
    },
    {
      key: "recorded",
      title: "Phòng đã ghi",
      value: dashboard.recordedRooms ?? 0,
      description: "Đã ghi chỉ số hoặc đã lập hóa đơn",
      icon: <CheckCircleOutlined />,
      color: "#16a34a",
      background: "#eaf8ef",
    },
    {
      key: "unrecorded",
      title: "Phòng chưa ghi",
      value: dashboard.unrecordedRooms ?? 0,
      description: "Phòng chưa có chỉ số trong kỳ",
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
        title="Quản lý điện nước"
        description="Ghi chỉ số điện nước từng phòng theo kỳ và theo dõi lượng tiêu thụ."
      />

      <Flex vertical gap={20}>
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            {/* Một hàng (màn lớn): tìm kiếm | tháng | năm | tòa nhà | trạng thái | xóa lọc */}
            <Col xs={24} sm={24} xl={8}>
              <Input
                allowClear
                placeholder="Tìm theo mã phòng, VD: A123"
                prefix={<SearchOutlined style={{ color: "#aaa" }} />}
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                maxLength={50}
              />
            </Col>

            <Col xs={12} sm={12} xl={3}>
              <CommonSelect
                placeholder="Tháng"
                value={filters.billingMonth}
                allowClear={false}
                options={MONTH_OPTIONS}
                onChange={(value) =>
                  value && updateFilter("billingMonth", value)
                }
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={12} sm={12} xl={3}>
              <CommonSelect
                placeholder="Năm"
                value={filters.billingYear}
                allowClear={false}
                options={YEAR_OPTIONS}
                onChange={(value) =>
                  value && updateFilter("billingYear", value)
                }
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} xl={4}>
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

            <Col xs={24} sm={12} xl={4}>
              <CommonSelect
                placeholder="Trạng thái"
                value={filters.status}
                options={STATUS_OPTIONS}
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

        <MyCard
          title={`Chỉ số điện nước tháng ${filters.billingMonth}/${filters.billingYear}`}
        >
          <CommonTable
            columns={columns}
            dataSource={readings.items}
            rowKey="roomId"
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: readings.totalItems,
            }}
            onPageChange={(page, size) => {
              setPagination({ page, size });
            }}
            emptyText="Chưa có phòng nào"
            totalText="phòng"
          />
        </MyCard>
      </Flex>

      {/* GHI / SỬA CHỈ SỐ */}
      {open.isModal && (
        <MeterReadingForm
          isMode={open.isMode}
          record={open.record || {}}
          isModal={open.isModal}
          hideModal={hideModal}
          fetchMeterReadings={refreshData}
          notify={notify}
          setLoading={setLoading}
        />
      )}
    </Fragment>
  );
};

export default MeterReadingPage;
