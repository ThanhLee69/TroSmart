import React, { Fragment, useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Col,
  Descriptions,
  Empty,
  Flex,
  Image,
  Modal,
  Result,
  Row,
  Skeleton,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CarOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  KeyOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  UserAddOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { LuBike } from "react-icons/lu";

import { path_name } from "../../../constants/path_name";
import {
  getTenantById,
  deleteTenant,
  getTenantContracts,
} from "../../../api/tenantApi";
import {
  getTenantVehiclesByTenantId,
  deleteTenantVehicle,
} from "../../../api/tenantVehicleApi";
import MyCard from "../../../components/MyCard";
import { useNotify } from "../../../components/NotificationProvider";
import TenantForm from "./TenantFrom";
import TenantVehicleForm from "../vehicle/TenantVehicleForm";
import { createTenantAccount } from "../../../api/userApi";
import "./TenantDetailPage.css";

const { Text } = Typography;

// Mật khẩu mặc định khi cấp tài khoản (khớp với backend)
const DEFAULT_PASSWORD = "123456";

const GENDER_LABEL = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

const RENTAL_STATUS = {
  RENTING: { label: "Đang thuê", tone: "green" },
  RETURNED: { label: "Đã từng thuê", tone: "gray" },
  NOT_RENTED: { label: "Chưa từng thuê", tone: "blue" },
};

const CONTRACT_STATUS = {
  ACTIVE: { label: "Đang hiệu lực", tone: "green" },
  EXPIRED: { label: "Hết hạn", tone: "gray" },
  TERMINATED: { label: "Đã chấm dứt", tone: "red" },
  DRAFT: { label: "Nháp", tone: "blue" },
};

const VEHICLE_TYPE_LABEL = {
  MOTORBIKE: "Xe máy",
  ELECTRIC_BICYCLE: "Xe đạp điện",
  BICYCLE: "Xe đạp",
};

const VEHICLE_TYPE_ICON = {
  MOTORBIKE: <LuBike />,
  ELECTRIC_BICYCLE: <ThunderboltOutlined />,
  BICYCLE: <LuBike />,
};

const formatDate = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");
const formatDateTime = (v) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—");
const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// Chấm màu + chữ, nền bo tròn
const Pill = ({ tone = "gray", children }) => (
  <span className={`td-pill td-pill--${tone}`}>
    <i />
    {children}
  </span>
);

function IdentityImage({ src, label }) {
  return (
    <figure className="tenant-id__item">
      <div className="tenant-id__frame">
        {src ? (
          <Image src={src} alt={label} preview={{ src }} />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có ảnh"
          />
        )}
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

const TenantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, contextHolder } = useNotify();
  const [modal, modalContextHolder] = Modal.useModal();

  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [vehicleModal, setVehicleModal] = useState({
    open: false,
    mode: "create",
    record: null,
  });

  const validId = id && Number.isFinite(Number(id)) && Number(id) > 0;

  const fetchVehicles = useCallback(async () => {
    if (!validId) {
      setVehicles([]);
      return;
    }

    setVehiclesLoading(true);

    try {
      const data = await getTenantVehiclesByTenantId(id);
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lấy danh sách phương tiện thất bại:", error);
      setVehicles([]);

      notify({
        type: "error",
        message: "Không tải được danh sách phương tiện",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setVehiclesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchContracts = useCallback(async () => {
    if (!validId) {
      setContracts([]);
      return;
    }

    setContractsLoading(true);

    try {
      const data = await getTenantContracts(id);
      setContracts(Array.isArray(data) ? data : (data?.result ?? []));
    } catch (error) {
      console.error("Lấy lịch sử thuê thất bại:", error);
      setContracts([]);

      notify({
        type: "error",
        message: "Không tải được lịch sử thuê",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setContractsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTenant = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      setTenant(await getTenantById(id));
    } catch (error) {
      console.error("Lấy chi tiết khách thuê thất bại:", error);
      setTenant(null);
      setErrorStatus(error?.response?.status === 404 ? 404 : "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  /* ---------- Thao tác ---------- */
  const handleDeleteTenant = () => {
    modal.confirm({
      title: "Xóa khách thuê",
      icon: <WarningOutlined />,
      content: `Bạn có chắc chắn muốn xóa khách thuê ${tenant?.fullName || ""}?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteTenant(tenant.id);
          notify({ type: "success", message: "Xóa khách thuê thành công!" });
          navigate(path_name.tenant);
        } catch (error) {
          notify({
            type: "error",
            message: "Xóa khách thuê thất bại!",
            description:
              error?.response?.data?.message ||
              "Không thể xóa khách thuê này. Hãy kiểm tra hợp đồng liên quan.",
          });
        }
      },
    });
  };

  const closeAccountModal = () => {
    if (!accountLoading) setAccountOpen(false);
  };

  const handleCreateAccount = async () => {
    if (!tenant?.id || accountLoading) return;

    try {
      setAccountLoading(true);

      await createTenantAccount(tenant.id);

      notify({
        type: "success",
        message: "Cấp tài khoản thành công",
        description: `Đã tạo tài khoản cho khách thuê ${tenant.fullName || ""}.`,
      });

      setAccountOpen(false);
      await fetchTenant();
    } catch (error) {
      console.error("Cấp tài khoản khách thuê thất bại:", error);

      notify({
        type: "error",
        message: "Cấp tài khoản thất bại",
        description:
          error?.response?.data?.message ||
          "Không thể cấp tài khoản. Hồ sơ có thể đã có tài khoản hoặc không tồn tại.",
      });
    } finally {
      setAccountLoading(false);
    }
  };

  const handleDeleteVehicle = (vehicle) => {
    modal.confirm({
      title: "Xóa phương tiện",
      icon: <WarningOutlined />,
      content: `Bạn có chắc chắn muốn xóa xe ${vehicle.licensePlate}?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteTenantVehicle(vehicle.id);
          notify({ type: "success", message: "Xóa phương tiện thành công!" });
          await fetchVehicles();
        } catch (error) {
          notify({
            type: "error",
            message: "Xóa phương tiện thất bại!",
            description:
              error?.response?.data?.message || "Vui lòng thử lại sau.",
          });
        }
      },
    });
  };

  const openVehicleModal = (mode, record = null) =>
    setVehicleModal({ open: true, mode, record });
  const closeVehicleModal = () =>
    setVehicleModal({ open: false, mode: "create", record: null });

  /* ---------- Tải và lỗi ---------- */
  if (loading && !tenant) {
    return (
      <Fragment>
        {contextHolder}
        {modalContextHolder}
        <MyCard>
          <Skeleton active avatar paragraph={{ rows: 8 }} />
        </MyCard>
      </Fragment>
    );
  }

  if (errorStatus) {
    return (
      <Fragment>
        {contextHolder}
        {modalContextHolder}
        <MyCard>
          <Result
            status={errorStatus === 404 ? "404" : "error"}
            title={
              errorStatus === 404
                ? "Không tìm thấy khách thuê"
                : "Không tải được thông tin khách thuê"
            }
            subTitle={
              errorStatus === 404
                ? "Khách thuê này không tồn tại hoặc đã bị xóa."
                : "Vui lòng kiểm tra kết nối đến máy chủ rồi thử lại."
            }
            extra={[
              <Button key="back" onClick={() => navigate(path_name.tenant)}>
                Về danh sách khách thuê
              </Button>,
              errorStatus !== 404 && (
                <Button key="retry" type="primary" onClick={fetchTenant}>
                  Thử lại
                </Button>
              ),
            ]}
          />
        </MyCard>
      </Fragment>
    );
  }

  /* ---------- Dữ liệu hiển thị ---------- */
  const age = tenant.dateOfBirth
    ? dayjs().diff(dayjs(tenant.dateOfBirth), "year")
    : null;
  const isRenting = tenant.rentalStatus === "RENTING";
  const rental = RENTAL_STATUS[tenant.rentalStatus] || {
    label: tenant.rentalStatus || "—",
    tone: "gray",
  };

  const personalItems = [
    { key: "name", label: "Họ và tên", children: tenant.fullName || "—" },
    {
      key: "dob",
      label: "Ngày sinh",
      children: tenant.dateOfBirth ? (
        <>
          {formatDate(tenant.dateOfBirth)}{" "}
          <Text type="secondary">({age} tuổi)</Text>
        </>
      ) : (
        "—"
      ),
    },
    {
      key: "gender",
      label: "Giới tính",
      children: GENDER_LABEL[tenant.gender] || tenant.gender || "—",
    },
    { key: "phone", label: "Số điện thoại", children: tenant.phone || "—" },
    { key: "email", label: "Email", children: tenant.email || "—" },
    { key: "job", label: "Nghề nghiệp", children: tenant.occupation || "—" },
    {
      key: "address",
      label: "Địa chỉ thường trú",
      children: tenant.permanentAddress || "—",
    },
    { key: "note", label: "Ghi chú", children: tenant.note || "—" },
  ];

  const rentalItems = [
    {
      key: "status",
      label: "Tình trạng",
      children: <Pill tone={rental.tone}>{rental.label}</Pill>,
    },
    { key: "building", label: "Tòa nhà", children: tenant.buildingName || "—" },
    { key: "room", label: "Phòng", children: tenant.roomNumber || "—" },
  ];

  const systemItems = [
    { key: "id", label: "Mã hệ thống", children: `#${tenant.id}` },
    {
      key: "createdAt",
      label: "Ngày tạo",
      children: formatDateTime(tenant.createdAt),
    },
    {
      key: "updatedAt",
      label: "Cập nhật lần cuối",
      children: formatDateTime(tenant.updatedAt),
    },
  ];

  return (
    <Fragment>
      {contextHolder}
      {modalContextHolder}

      <div className="tenant-detail">
        {/* ===== Hero ===== */}
        <div className="tenant-hero">
          <Button
            className="tenant-hero__back"
            icon={<ArrowLeftOutlined />}
            aria-label="Quay lại danh sách khách thuê"
            onClick={() => navigate(path_name.tenant)}
          />

          <Avatar className="tenant-hero__avatar">
            {initialsOf(tenant.fullName)}
          </Avatar>

          <div className="tenant-hero__main">
            <Flex align="center" wrap="wrap" gap={10}>
              <h1 className="tenant-hero__name">{tenant.fullName}</h1>
              <Pill tone={rental.tone}>{rental.label}</Pill>
            </Flex>

            <div className="tenant-hero__sub">
              {isRenting && tenant.roomNumber ? (
                <span>
                  Phòng {tenant.roomNumber}
                  {tenant.buildingName ? ` - ${tenant.buildingName}` : ""}
                </span>
              ) : (
                <span>Khách thuê</span>
              )}
              <i />
              <span>Tham gia {formatDate(tenant.createdAt)}</span>
            </div>
          </div>

          <div className="tenant-hero__actions">
            {!isRenting && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleDeleteTenant}
              >
                Xóa
              </Button>
            )}
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setEditOpen(true)}
            >
              Chỉnh sửa
            </Button>
          </div>
        </div>

        <Row gutter={[20, 20]}>
          {/* Cột trái */}
          <Col xs={24} lg={15} xl={16}>
            <Flex vertical gap={20}>
              <MyCard
                title={<span className="td-title">Thông tin cá nhân</span>}
              >
                <Descriptions
                  column={1}
                  size="small"
                  items={personalItems}
                  className="tenant-detail__desc"
                />
              </MyCard>

              <MyCard
                title={
                  <Flex
                    align="center"
                    justify="space-between"
                    gap={12}
                    wrap="wrap"
                    style={{ width: "100%" }}
                  >
                    <span className="td-title">Giấy tờ tùy thân</span>
                    <Flex align="center" wrap="wrap" gap={8}>
                      <span className="tenant-idno">
                        <Text type="secondary">Số CCCD</Text>
                        <b>{tenant.identityNumber || "—"}</b>
                      </span>
                      <span className="tenant-idno">
                        <Text type="secondary">Ngày cấp</Text>
                        <b>{formatDate(tenant.identityIssuedDate)}</b>
                      </span>
                    </Flex>
                  </Flex>
                }
              >
                <Image.PreviewGroup>
                  <div className="tenant-id">
                    <IdentityImage
                      src={tenant.identityFrontImage}
                      label="Mặt trước"
                    />
                    <IdentityImage
                      src={tenant.identityBackImage}
                      label="Mặt sau"
                    />
                  </div>
                </Image.PreviewGroup>
              </MyCard>

              <MyCard
                title={
                  <Flex
                    align="center"
                    justify="space-between"
                    gap={12}
                    wrap="wrap"
                    style={{ width: "100%" }}
                  >
                    <Flex align="center" gap={10}>
                      <span className="td-title">Phương tiện</span>
                      <span className="tenant-count">{vehicles.length} xe</span>
                    </Flex>
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => openVehicleModal("create")}
                    >
                      Thêm phương tiện
                    </Button>
                  </Flex>
                }
              >
                <Spin spinning={vehiclesLoading}>
                  {vehicles.length ? (
                    <div className="tenant-list">
                      {vehicles.map((v) => (
                        <div key={v.id} className="tenant-row">
                          <span className="tenant-row__icon">
                            {VEHICLE_TYPE_ICON[v.vehicleType] || (
                              <CarOutlined />
                            )}
                          </span>
                          <div className="tenant-row__main">
                            <Flex align="center" gap={8} wrap="wrap">
                              <b className="tenant-plate">{v.licensePlate}</b>
                              <span className="tenant-type">
                                {VEHICLE_TYPE_LABEL[v.vehicleType] ||
                                  v.vehicleType}
                              </span>
                            </Flex>
                            <Text type="secondary">
                              {[
                                v.brand,
                                v.color && `Màu ${v.color.toLowerCase()}`,
                                v.note,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </Text>
                          </div>
                          <Flex gap={4}>
                            <Tooltip title="Sửa">
                              <Button
                                type="text"
                                icon={<EditOutlined />}
                                aria-label={`Sửa xe ${v.licensePlate}`}
                                onClick={() => openVehicleModal("edit", v)}
                              />
                            </Tooltip>
                            <Tooltip title="Xóa">
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                aria-label={`Xóa xe ${v.licensePlate}`}
                                onClick={() => handleDeleteVehicle(v)}
                              />
                            </Tooltip>
                          </Flex>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !vehiclesLoading && (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Khách thuê chưa đăng ký phương tiện nào"
                      />
                    )
                  )}
                </Spin>
              </MyCard>
            </Flex>
          </Col>

          {/* Cột phải */}
          <Col xs={24} lg={9} xl={8}>
            <Flex vertical gap={20}>
              <MyCard title={<span className="td-title">Thuê phòng</span>}>
                <Descriptions
                  column={1}
                  size="small"
                  items={rentalItems}
                  className="tenant-detail__desc"
                />
                <Text type="secondary" className="tenant-detail__hint">
                  Thông tin được xác định từ hợp đồng của khách thuê.
                </Text>
              </MyCard>

              <MyCard
                title={
                  <Flex align="center" gap={10}>
                    <span className="td-title">Lịch sử thuê</span>
                    <span className="tenant-count">{contracts.length}</span>
                  </Flex>
                }
              >
                <Spin spinning={contractsLoading}>
                  {contracts.length ? (
                    <div className="tenant-timeline">
                      {contracts.map((c) => {
                        const st = CONTRACT_STATUS[c.status] || {
                          label: c.status || "—",
                          tone: "gray",
                        };
                        const end = c.actualEndDate || c.endDate;

                        return (
                          <div key={c.id} className="tl-item">
                            <span className={`tl-dot tl-dot--${st.tone}`} />
                            <div className="tl-card">
                              <Flex
                                align="center"
                                justify="space-between"
                                gap={8}
                                wrap="wrap"
                              >
                                <b className="tl-title">
                                  <FileTextOutlined /> {c.contractCode}
                                </b>
                                <Pill tone={st.tone}>{st.label}</Pill>
                              </Flex>

                              <div className="tl-room">
                                Phòng {c.roomNumber || "—"}
                                {c.buildingName ? ` · ${c.buildingName}` : ""}
                              </div>

                              <div className="tl-date">
                                {formatDate(c.startDate)} → {formatDate(end)}
                                {c.actualEndDate && c.status !== "ACTIVE" && (
                                  <Text type="secondary"> (thực tế)</Text>
                                )}
                              </div>

                              <div className="tl-foot">
                                <span>
                                  {c.rentPrice != null
                                    ? `${Number(c.rentPrice).toLocaleString("vi-VN")} đ/tháng`
                                    : "—"}
                                </span>
                                {c.primary && (
                                  <span className="tl-badge">
                                    Người thuê chính
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    !contractsLoading && (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có hợp đồng nào"
                      />
                    )
                  )}
                </Spin>
              </MyCard>

              <MyCard
                title={<span className="td-title">Tài khoản đăng nhập</span>}
              >
                <Descriptions
                  column={1}
                  size="small"
                  className="tenant-detail__desc"
                  items={[
                    {
                      key: "linked",
                      label: "Liên kết",
                      children: tenant.userId ? (
                        <Pill tone="purple">Đã liên kết</Pill>
                      ) : (
                        <Pill tone="orange">Chưa liên kết</Pill>
                      ),
                    },
                    {
                      key: "userId",
                      label: "Mã tài khoản",
                      children: tenant.userId ? `#${tenant.userId}` : "—",
                    },
                  ]}
                />
                {tenant.userId ? (
                  <Text type="secondary" className="tenant-detail__hint">
                    Khách thuê có thể đăng nhập cổng người thuê để xem hóa đơn
                    và gửi yêu cầu sửa chữa.
                  </Text>
                ) : (
                  <Button
                    block
                    icon={<UserAddOutlined />}
                    className="tenant-detail__cta"
                    onClick={() => setAccountOpen(true)}
                  >
                    Cấp tài khoản
                  </Button>
                )}
              </MyCard>

              <MyCard title={<span className="td-title">Liên hệ nhanh</span>}>
                <div className="tenant-quick">
                  <Button
                    icon={<PhoneOutlined />}
                    href={tenant.phone ? `tel:${tenant.phone}` : undefined}
                    disabled={!tenant.phone}
                  >
                    Gọi điện
                  </Button>
                  <Button
                    icon={<MailOutlined />}
                    href={tenant.email ? `mailto:${tenant.email}` : undefined}
                    disabled={!tenant.email}
                  >
                    Gửi email
                  </Button>
                </div>
              </MyCard>

              <MyCard
                title={<span className="td-title">Thông tin hệ thống</span>}
              >
                <Descriptions
                  column={1}
                  size="small"
                  items={systemItems}
                  className="tenant-detail__desc"
                />
              </MyCard>
            </Flex>
          </Col>
        </Row>
      </div>

      {/* Chỉnh sửa khách thuê */}
      <TenantForm
        isMode="edit"
        record={tenant}
        isModal={editOpen}
        hideModal={() => setEditOpen(false)}
        fetchTenants={fetchTenant}
        notify={notify}
      />

      {/* Thêm / sửa phương tiện */}
      <TenantVehicleForm
        isMode={vehicleModal.mode}
        record={vehicleModal.record || {}}
        isModal={vehicleModal.open}
        hideModal={closeVehicleModal}
        fetchVehicles={fetchVehicles}
        setLoading={() => {}}
        notify={notify}
        tenantId={tenant.id}
      />

      {/* Cấp tài khoản */}
      <Modal
        className="ta-modal"
        title={
          <div className="ta-title">
            <span className="ta-title__icon">
              <UserAddOutlined />
            </span>
            <div>
              <div className="ta-title__main">Cấp tài khoản khách thuê</div>
              <div className="ta-title__sub">
                Khách dùng tài khoản này để đăng nhập cổng khách thuê
              </div>
            </div>
          </div>
        }
        open={accountOpen}
        onCancel={closeAccountModal}
        centered
        width={460}
        maskClosable={!accountLoading}
        closable={!accountLoading}
        keyboard={!accountLoading}
        footer={
          <div className="ta-footer">
            <Button onClick={closeAccountModal} disabled={accountLoading}>
              Hủy
            </Button>
            <Button
              type="primary"
              className="ta-btn-primary"
              loading={accountLoading}
              onClick={handleCreateAccount}
            >
              Cấp tài khoản
            </Button>
          </div>
        }
        destroyOnHidden
      >
        <div className="ta-info">
          <div className="ta-row">
            <span className="ta-row__icon">
              <UserOutlined />
            </span>
            <div>
              <div className="ta-row__label">Họ và tên</div>
              <div className="ta-row__value">{tenant.fullName || "—"}</div>
            </div>
          </div>

          <div className="ta-row">
            <span className="ta-row__icon">
              <PhoneOutlined />
            </span>
            <div>
              <div className="ta-row__label">Tên đăng nhập (số điện thoại)</div>
              <div className="ta-row__value">{tenant.phone || "—"}</div>
            </div>
          </div>

          <div className="ta-row">
            <span className="ta-row__icon ta-row__icon--key">
              <KeyOutlined />
            </span>
            <div>
              <div className="ta-row__label">Mật khẩu mặc định</div>
              <div className="ta-row__value ta-row__value--code">
                {DEFAULT_PASSWORD}
              </div>
            </div>
          </div>
        </div>

        <div className="ta-note">
          Khách nên đổi mật khẩu sau lần đăng nhập đầu tiên.
        </div>
      </Modal>
    </Fragment>
  );
};

export default TenantDetailPage;
