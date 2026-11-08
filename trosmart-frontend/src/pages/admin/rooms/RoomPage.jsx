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
  Empty,
  Flex,
  Image,
  Input,
  Row,
  Select,
  Tooltip,
  Typography,
} from "antd";
import {
  AppstoreOutlined,
  EyeOutlined,
  HomeOutlined,
  KeyOutlined,
  SearchOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { getRoomDashboard, getRooms } from "../../../api/roomApi";
import { getBuildingOptions } from "../../../api/buildingApi";
import MyCard from "../../../components/MyCard";
import { useNotify } from "../../../components/NotificationProvider";
import RoomForm from "./RoomForm";
import { path_name } from "../../../constants/path_name";
import { formatCurrency } from "../../../utils/format-currency";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";
import CommonStatisticCards from "../../../components/CommonStatisticCards";
import "../../../assets/style/FilterBar.css";
import "./RoomPage.css";

const { Text } = Typography;

// Trạng thái phòng, giá trị khớp enum RoomStatus ở backend
const ROOM_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Phòng trống" },
  { value: "OCCUPIED", label: "Đang thuê" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "RESERVED", label: "Đã đặt" },
];

// Loại phòng, giá trị khớp enum RoomType ở backend
const ROOM_TYPE_OPTIONS = [
  { value: "STANDARD", label: "Phòng thường" },
  { value: "LOFT", label: "Phòng gác lửng" },
  { value: "STUDIO", label: "Studio" },
  { value: "MINI_APARTMENT", label: "Căn hộ mini" },
];

// Màu chấm + nền của trạng thái phòng (khớp màu thẻ thống kê)
const STATUS_TONE_MAP = {
  OCCUPIED: "green",
  AVAILABLE: "orange",
  MAINTENANCE: "red",
  RESERVED: "blue",
};

// Màu chấm của loại phòng
const ROOM_TYPE_TONE_MAP = {
  STANDARD: "blue",
  LOFT: "purple",
  STUDIO: "teal",
  MINI_APARTMENT: "amber",
};

// Chấm màu + chữ, bọc nền nhạt (không dùng Tag)
const StatusPill = ({ value, children }) => (
  <span className={`rp-pill rp-pill--${STATUS_TONE_MAP[value] || "gray"}`}>
    <i />
    {children}
  </span>
);

// Chấm màu đứng trước chữ
const TypeDot = ({ value, children }) => (
  <span className={`rp-type rp-type--${ROOM_TYPE_TONE_MAP[value] || "gray"}`}>
    <i />
    {children}
  </span>
);

const RoomPage = () => {
  const { notify, contextHolder } = useNotify();
  const navigate = useNavigate();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const [filters, setFilters] = useState({
    keyword: "",
    roomType: undefined,
    status: undefined,
    buildingId: undefined,
  });

  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  const [rooms, setRooms] = useState({
    items: [],
    totalItems: 0,
  });

  const [buildings, setBuildings] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [loading, setLoading] = useState(false);

  const [formModal, setFormModal] = useState({
    isOpen: false,
    mode: "",
    record: null,
  });

  // =========================
  // LOAD BUILDINGS
  // =========================
  const fetchBuildings = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  // =========================
  // LOAD ROOMS
  // =========================
  const fetchRooms = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getRooms({
        keyword: filters.keyword.trim() || undefined,
        roomType: filters.roomType || undefined,
        status: filters.status || undefined,
        buildingId: filters.buildingId || undefined,
        page: pagination.page,
        size: pagination.size,
      });

      setRooms({
        items: data?.items ?? [],
        totalItems: data?.totalItems ?? 0,
      });
    } catch (error) {
      console.error("Lấy danh sách phòng thất bại:", error);

      setRooms({
        items: [],
        totalItems: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [
    filters.keyword,
    filters.roomType,
    filters.status,
    filters.buildingId,
    pagination.page,
    pagination.size,
  ]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // =========================
  // LOAD DASHBOARD
  // =========================
  const loadDashboard = useCallback(async () => {
    try {
      const data = await getRoomDashboard(filters.buildingId);
      setDashboard(data ?? {});
    } catch (error) {
      console.error("Lấy thống kê phòng thất bại:", error);

      notifyRef.current({
        type: "error",
        message: "Không thể tải thống kê phòng",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    }
  }, [filters.buildingId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
      roomType: undefined,
      status: undefined,
      buildingId: undefined,
    });

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // =========================
  // ADD / EDIT ROOM
  // =========================
  const showModal = (mode, record = null) => {
    setFormModal({
      isOpen: true,
      mode,
      record,
    });
  };

  const hideModal = () => {
    setFormModal({
      isOpen: false,
      mode: "",
      record: null,
    });
  };

  // =========================
  // VIEW ROOM DETAIL
  // =========================
  const handleViewDetail = (record) => {
    if (!record?.id) {
      notifyRef.current({
        type: "error",
        message: "Không tìm thấy ID phòng",
      });
      return;
    }

    navigate(path_name.roomDetail.replace(":roomId", record.id));
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      title: "Ảnh",
      key: "thumbnail",
      width: 82,
      render: (_, record) => {
        return record.thumbnailUrl ? (
          <Image
            src={record.thumbnailUrl}
            alt={`Phòng ${record.roomNumber}`}
            width={48}
            height={48}
            preview={false}
            style={{
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        ) : (
          <Flex
            align="center"
            justify="center"
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: "#f0f2f5",
              color: "#8c8c8c",
            }}
          >
            <HomeOutlined style={{ fontSize: 20 }} />
          </Flex>
        );
      },
    },
    {
      title: "Mã phòng",
      dataIndex: "roomNumber",
      key: "roomNumber",
      width: 120,
      render: (value) => <Text strong>{value || "—"}</Text>,
    },
    {
      title: "Tòa nhà",
      key: "buildingName",
      width: 180,
      ellipsis: true,
      render: (_, record) =>
        record.buildingName || record.building?.name || "—",
    },
    {
      title: "Loại phòng",
      dataIndex: "roomType",
      key: "roomType",
      width: 135,
      render: (value) => {
        const option = ROOM_TYPE_OPTIONS.find((item) => item.value === value);

        if (!value) return "—";

        return <TypeDot value={value}>{option?.label || value}</TypeDot>;
      },
    },
    {
      title: "Tầng",
      dataIndex: "floor",
      key: "floor",
      width: 75,
      render: (value) => value ?? "—",
    },
    {
      title: "Diện tích",
      dataIndex: "area",
      key: "area",
      width: 105,
      render: (value) => (value != null ? `${value} m²` : "—"),
    },
    {
      title: "Giá thuê",
      dataIndex: "rentalPrice",
      key: "rentalPrice",
      width: 125,
      render: (value) => (value != null ? formatCurrency(value, true) : "—"),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 135,
      render: (value) => {
        const option = ROOM_STATUS_OPTIONS.find((item) => item.value === value);

        return (
          <StatusPill value={value}>{option?.label || value || "—"}</StatusPill>
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
            aria-label={`Xem chi tiết phòng ${record.roomNumber}`}
            onClick={() => handleViewDetail(record)}
          />
        </Tooltip>
      ),
    },
  ];

  // =========================
  // STATISTICS
  // =========================
  const totalRooms = dashboard.totalRooms ?? 0;
  const occupiedRooms = dashboard.occupiedRooms ?? 0;
  const availableRooms = dashboard.availableRooms ?? 0;
  const maintenanceRooms = dashboard.maintenanceRooms ?? 0;

  const statisticCards = [
    {
      key: "total",
      title: "Tổng số phòng",
      value: totalRooms,
      description: "Tổng số phòng trong hệ thống",
      icon: <AppstoreOutlined />,
      color: "#536ee7",
      background: "#eef1ff",
    },
    {
      key: "occupied",
      title: "Phòng đang thuê",
      value: occupiedRooms,
      description: `Chiếm ${Number(dashboard?.occupancyRate ?? 0).toFixed(
        1,
      )}% tổng số phòng`,
      icon: <TeamOutlined />,
      color: "#16a34a",
      background: "#eaf8ef",
    },
    {
      key: "available",
      title: "Phòng đang trống",
      value: availableRooms,
      description: "Phòng có thể xem xét cho thuê",
      icon: <KeyOutlined />,
      color: "#d97706",
      background: "#fff7e8",
    },
    {
      key: "maintenance",
      title: "Phòng bảo trì",
      value: maintenanceRooms,
      description: "Phòng đang sửa chữa hoặc bảo dưỡng",
      icon: <ToolOutlined />,
      color: "#dc2626",
      background: "#fff0f0",
    },
  ];

  return (
    <Fragment>
      {contextHolder}

      <PageHeader
        title="Quản lý phòng trọ"
        description="Quản lý thông tin, giá thuê và tình trạng các phòng trong hệ thống."
        buttonText="Thêm phòng"
        onButtonClick={() => showModal("add")}
      />

      <Flex vertical gap={20}>
        {/* TÌM KIẾM VÀ LỌC */}
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[12, 12]} className="app-filter">
            <Col xs={24} md={24} xl={9}>
              <Input
                allowClear
                value={filters.keyword}
                placeholder="Tìm theo mã phòng..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                onChange={(event) =>
                  updateFilter("keyword", event.target.value)
                }
              />
            </Col>

            <Col xs={24} sm={12} xl={5}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Chọn tòa nhà"
                value={filters.buildingId}
                style={{ width: "100%" }}
                options={buildings.map((building) => ({
                  value: building.id,
                  label: building.name,
                }))}
                onChange={(value) => updateFilter("buildingId", value)}
              />
            </Col>

            <Col xs={24} sm={12} xl={4}>
              <Select
                allowClear
                placeholder="Loại phòng"
                value={filters.roomType}
                style={{ width: "100%" }}
                options={ROOM_TYPE_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                onChange={(value) => updateFilter("roomType", value)}
              />
            </Col>

            <Col xs={24} sm={12} xl={4}>
              <Select
                allowClear
                placeholder="Trạng thái"
                value={filters.status}
                style={{ width: "100%" }}
                options={ROOM_STATUS_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                onChange={(value) => updateFilter("status", value)}
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

        {/* THỐNG KÊ */}
        <CommonStatisticCards items={statisticCards} />

        {/* DANH SÁCH PHÒNG */}
        <MyCard title="Danh sách phòng trọ">
          <div className="rp-table">
            <CommonTable
              columns={columns}
              dataSource={rooms.items}
              rowKey="id"
              loading={loading}
              pagination={{
                page: pagination.page,
                size: pagination.size,
                totalItems: rooms.totalItems,
              }}
              onPageChange={(page, size) => {
                setPagination({ page, size });
              }}
              emptyText="Chưa có phòng nào"
              totalText="phòng"
            />
          </div>
        </MyCard>
      </Flex>

      {/* MODAL THÊM / CHỈNH SỬA */}
      {formModal.isOpen && (
        <RoomForm
          isMode={formModal.mode}
          record={formModal.record || {}}
          hideModal={hideModal}
          isModal={formModal.isOpen}
          fetchRooms={fetchRooms}
          notify={notify}
          loadDashboard={loadDashboard}
          buildings={buildings}
        />
      )}
    </Fragment>
  );
};

export default RoomPage;
