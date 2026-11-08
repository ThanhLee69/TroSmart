import React, { Fragment, useEffect, useRef, useState } from "react";
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
  EyeOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { FiMapPin } from "react-icons/fi";

import { deleteBuilding, getBuildings } from "../../../api/buildingApi";

import "../../../assets/style/FilterBar.css";
import "./BuildingPage.css";

import MyCard from "../../../components/MyCard";
import { useNotify } from "../../../components/NotificationProvider";
import BuildingForm from "./BuildingFrom";
import BuildingDetailDrawer from "./BuildingDetailDrawer";
import PageHeader from "../../../components/PageHeader";
import CommonTable from "../../../components/CommonTable";

const { Text } = Typography;

const BuildingPage = () => {
  const fetchingRef = useRef(false);
  const { notify, contextHolder } = useNotify();

  const [buildings, setBuildings] = useState({
    items: [],
    totalItems: 0,
  });

  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    size: 10,
  });

  const [open, setOpen] = useState({
    isModal: false,
    isMode: "",
    record: null,
  });

  // Drawer xem chi tiết
  const [detail, setDetail] = useState({ open: false, record: null });

  // =========================
  // Lấy danh sách tòa nhà
  // =========================
  const fetchBuilding = async () => {
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);

    try {
      const res = await getBuildings({
        keyword,
        page: pagination.page,
        size: pagination.size,
      });

      setBuildings({
        items: res?.items || [],
        totalItems: res?.totalItems || 0,
      });
    } catch (error) {
      console.error("Lỗi tải danh sách tòa nhà:", error);

      notify({
        type: "error",
        message: "Không thể tải danh sách tòa nhà!",
      });
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuilding();
  }, [keyword, pagination.page, pagination.size]);

  // =========================
  // Tìm kiếm
  // =========================
  const handleKeywordChange = (e) => {
    setKeyword(e.target.value);

    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // =========================
  // Phân trang
  // =========================
  const handlePageChange = (page, size) => {
    setPagination({
      page: size !== pagination.size ? 1 : page,
      size,
    });
  };

  // =========================
  // Mở / đóng form
  // =========================
  const showModal = (mode, record = null) => {
    setOpen({
      isModal: true,
      isMode: mode,
      record,
    });
  };

  const hideModal = () => {
    setOpen({
      isModal: false,
      isMode: "",
      record: null,
    });
  };

  // =========================
  // Xóa mềm tòa nhà
  // =========================
  const handleDelete = async (id) => {
    try {
      setLoading(true);

      const res = await deleteBuilding(id);

      notify({
        type: "success",
        message: "Xóa tòa nhà thành công!",
        description: res?.message || "Tòa nhà đã được xóa khỏi danh sách.",
      });

      await fetchBuilding();
    } catch (error) {
      console.error("Lỗi xóa tòa nhà:", error);

      notify({
        type: "error",
        message: error?.response?.data?.message || "Không thể xóa tòa nhà.",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Cột bảng
  // =========================
  const columns = [
    {
      title: "Tên tòa nhà",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (name) => <Text strong>{name || "-"}</Text>,
    },
    {
      title: "Địa chỉ",
      key: "address",
      width: 300,
      render: (_, record) => {
        const location = [
          record.address,
          record.ward,
          record.district,
          record.province,
        ].filter(Boolean);

        if (location.length === 0) {
          return <Text type="secondary">Chưa cập nhật</Text>;
        }

        return (
          <Space size={6} align="start">
            <FiMapPin
              size={15}
              style={{
                color: "#536ee7",
                marginTop: 4,
                flexShrink: 0,
              }}
            />

            <Text>{location.join(", ")}</Text>
          </Space>
        );
      },
    },
    {
      title: "Tiện nghi chung",
      dataIndex: "amenities",
      key: "amenities",
      width: 200,
      render: (amenities = []) => {
        if (!amenities.length) {
          return <Text type="secondary">Chưa có tiện nghi</Text>;
        }

        const visibleAmenities = amenities.slice(0, 2);
        const extra = amenities.length - visibleAmenities.length;

        return (
          <div className="bld-chips">
            {visibleAmenities.map((amenity) => (
              <span className="bld-chip" key={amenity.id}>
                {amenity.name}
              </span>
            ))}

            {extra > 0 && (
              <Tooltip
                title={amenities
                  .slice(2)
                  .map((amenity) => amenity.name)
                  .join(", ")}
              >
                <span className="bld-chip bld-chip--more">+{extra}</span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 220,
      // max-width: 0 để nội dung không tự nới ô: chữ bám đúng chiều rộng cột
      // (phần bảng còn dư được chia cho cột) rồi mới hiện "..."
      onCell: () => ({ style: { maxWidth: 0 } }),
      render: (description) =>
        description ? (
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
        ) : (
          <Text type="secondary">Chưa có mô tả</Text>
        ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 76,
      fixed: "right",
      align: "center",
      render: (_, record) => (
        <Tooltip title="Xem chi tiết">
          <Button
            type="text"
            icon={<EyeOutlined />}
            aria-label={`Xem chi tiết ${record.name}`}
            onClick={() => setDetail({ open: true, record })}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Fragment>
      {contextHolder}

      <PageHeader
        title="Quản lý tòa nhà"
        description="Quản lý thông tin các tòa nhà, địa chỉ và tiện nghi chung."
        buttonText="Thêm tòa nhà"
        onButtonClick={() => showModal("create")}
      />

      <Flex vertical gap={20}>
        {/* Tìm kiếm */}
        <MyCard title="Tìm kiếm và lọc">
          <Row gutter={[10, 10]} className="app-filter">
            <Col xs={24} md={18} xl={20}>
              <Input
                allowClear
                value={keyword}
                placeholder="Tìm theo tên tòa nhà hoặc địa chỉ..."
                prefix={<SearchOutlined style={{ color: "#8c8c8c" }} />}
                onChange={handleKeywordChange}
              />
            </Col>

            <Col xs={24} md={6} xl={4}>
              <Button
                block
                className="app-filter__clear"
                onClick={() => {
                  setKeyword("");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                Xóa lọc
              </Button>
            </Col>
          </Row>
        </MyCard>

        {/* Danh sách */}
        <MyCard title="Danh sách tòa nhà">
          <CommonTable
            columns={columns}
            dataSource={buildings.items}
            rowKey="id"
            loading={loading}
            pagination={{
              page: pagination.page,
              size: pagination.size,
              totalItems: buildings.totalItems,
            }}
            onPageChange={handlePageChange}
            emptyText="Chưa có tòa nhà nào"
            totalText="tòa nhà"
          />
        </MyCard>
      </Flex>

      <BuildingDetailDrawer
        open={detail.open}
        record={detail.record}
        onClose={() => setDetail((prev) => ({ ...prev, open: false }))}
        onEdit={(record) => {
          setDetail({ open: false, record: null });
          showModal("edit", record);
        }}
        onDelete={async (record) => {
          setDetail({ open: false, record: null });
          await handleDelete(record.id);
        }}
      />

      {open.isModal && (
        <BuildingForm
          isMode={open.isMode}
          record={open.record || {}}
          hideModal={hideModal}
          isModal={open.isModal}
          fetchBuilding={fetchBuilding}
          notify={notify}
          setLoading={setLoading}
        />
      )}
    </Fragment>
  );
};

export default BuildingPage;
