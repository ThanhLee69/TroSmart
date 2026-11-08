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
  SearchOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import "../../../assets/style/FilterBar.css";
import "./AmenityPage.css";

import MyCard from "../../../components/MyCard";
import CommonSelect from "../../../components/CommonSelect";
import AmenityForm from "./AmenityForm";
import { useNotify } from "../../../components/NotificationProvider";
import PageHeader from "../../../components/PageHeader";
import { getAmenities, deleteAmenity } from "../../../api/amenityApi";
import CommonTable from "../../../components/CommonTable";

const { Text } = Typography;

// Phạm vi áp dụng (AmenityScope): chấm màu + chữ
const SCOPE_CONFIG = {
  BUILDING: {
    color: "#1677ff",
    background: "#eff6ff",
    border: "#bfdbfe",
    text: "Tòa nhà",
  },
  ROOM: {
    color: "#16a34a",
    background: "#f0fdf4",
    border: "#bbf7d0",
    text: "Phòng",
  },
  BOTH: {
    color: "#722ed1",
    background: "#f5f0ff",
    border: "#d9c8f7",
    text: "Cả hai",
  },
};

const SCOPE_OPTIONS = Object.entries(SCOPE_CONFIG).map(([value, config]) => ({
  value,
  label: config.text,
}));

const formatDate = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "—");

const ScopeDisplay = ({ value }) => {
  const config = SCOPE_CONFIG[value];

  if (!config) return <span>{value || "—"}</span>;

  return (
    <span
      className="amn-scope"
      style={{
        color: config.color,
        backgroundColor: config.background,
        borderColor: config.border,
      }}
    >
      <span
        className="amn-scope__dot"
        style={{ backgroundColor: config.color }}
      />
      <span>{config.text}</span>
    </span>
  );
};

const AmenityPage = () => {
  const { notify, contextHolder } = useNotify();

  // DATA
  const [amenities, setAmenities] = useState({
    items: [],
    totalItems: 0,
  });

  // SEARCH & FILTER
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState(undefined);

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

  // GET AMENITIES
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);

        const data = await getAmenities({
          keyword: keyword.trim() || undefined,
          scope: scope || undefined,
          page: pagination.page,
          size: pagination.size,
        });

        if (cancelled) return;

        setAmenities({
          items: data?.items || [],
          totalItems: data?.totalItems || 0,
        });
      } catch (error) {
        if (cancelled) return;

        console.error("Get amenities error:", error);

        notify({
          type: "error",
          message: "Lỗi tải dữ liệu",
          description:
            error?.response?.data?.message ||
            "Không thể tải danh sách tiện ích!",
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
  }, [keyword, scope, pagination.page, pagination.size]);

  // REFRESH DATA AFTER CREATE, UPDATE OR DELETE
  const fetchAmenities = async () => {
    try {
      const data = await getAmenities({
        keyword: keyword.trim() || undefined,
        scope: scope || undefined,
        page: pagination.page,
        size: pagination.size,
      });

      setAmenities({
        items: data?.items || [],
        totalItems: data?.totalItems || 0,
      });
    } catch (error) {
      console.error("Refresh amenities error:", error);

      notify({
        type: "error",
        message: "Lỗi tải dữ liệu",
        description:
          error?.response?.data?.message || "Không thể tải danh sách tiện ích!",
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
  const handleScopeChange = (value) => {
    setScope(value);

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

      await deleteAmenity(id);

      notify({
        type: "success",
        message: "Xóa thành công!",
        description: "Đã xóa tiện ích khỏi hệ thống.",
      });

      if (amenities.items.length === 1 && pagination.page > 1) {
        setPagination((prev) => ({
          ...prev,
          page: prev.page - 1,
        }));
      } else {
        await fetchAmenities();
      }
    } catch (error) {
      console.error("Delete amenity error:", error);

      notify({
        type: "error",
        message: "Xóa thất bại!",
        description:
          error?.response?.data?.message || "Không thể xóa tiện ích.",
      });
    } finally {
      setLoading(false);
    }
  };

  // TABLE COLUMNS
  const columns = [
    {
      title: "Tên tiện ích",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name) => <Text style={{ fontWeight: 500 }}>{name}</Text>,
    },
    {
      title: "Phạm vi áp dụng",
      dataIndex: "scope",
      key: "scope",
      width: 180,
      render: (value) => <ScopeDisplay value={value} />,
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
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date) => <Text>{formatDate(date)}</Text>,
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

          <Popconfirm
            title="Xóa tiện ích?"
            description="Bạn có chắc chắn muốn xóa tiện ích này?"
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
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <PageHeader
        title="Quản lý tiện ích"
        description="Thiết lập các tiện ích được áp dụng cho tòa nhà và phòng."
        buttonText="Thêm tiện ích"
        onButtonClick={() => showModal("create")}
      />

      <Flex vertical gap={20}>
        {/* SEARCH & FILTER */}
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            <Col xs={24} sm={24} md={24} xl={16}>
              <Input
                allowClear
                value={keyword}
                placeholder="Tìm theo tên hoặc mô tả tiện ích..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                onChange={handleKeywordChange}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={6}>
              <CommonSelect
                allowClear
                placeholder="Phạm vi áp dụng"
                value={scope}
                options={SCOPE_OPTIONS}
                onChange={handleScopeChange}
                style={{ width: "100%" }}
              />
            </Col>

            <Col xs={24} sm={12} md={12} xl={2}>
              <Button
                block
                className="app-filter__clear"
                onClick={() => {
                  setKeyword("");
                  setScope(undefined);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                Xóa lọc
              </Button>
            </Col>
          </Row>
        </MyCard>

        {/* AMENITY TABLE */}
        <MyCard title="Danh sách tiện ích">
          <CommonTable
            columns={columns}
            dataSource={amenities.items}
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: amenities.totalItems,
            }}
            onPageChange={handlePageChange}
            emptyText="Chưa có tiện ích nào"
            totalText="tiện ích"
          />
        </MyCard>
      </Flex>

      {/* AMENITY FORM */}
      <AmenityForm
        isMode={open.isMode}
        record={open.record || {}}
        isModal={open.isModal}
        hideModal={hideModal}
        fetchAmenities={fetchAmenities}
        setLoading={setLoading}
        notify={notify}
      />
    </>
  );
};

export default AmenityPage;
