import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Avatar,
  Button,
  Col,
  Descriptions,
  Empty,
  Flex,
  Image,
  Modal,
  Progress,
  Result,
  Row,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FormOutlined,
  HomeOutlined,
  LeftOutlined,
  PlusOutlined,
  RightOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

import {
  deleteRoom,
  getRoomById,
  updateRoomMaintenance,
} from "../../../api/roomApi";
import { getBuildingOptions } from "../../../api/buildingApi";

import MyCard from "../../../components/MyCard";
import { useNotify } from "../../../components/NotificationProvider";
import RoomForm from "./RoomForm";
import { formatCurrency } from "../../../utils/format-currency";

import "./RoomDetailPage.css";
import { path_name } from "../../../constants/path_name.js";

const { Text, Paragraph } = Typography;

/* =========================================================
   CẤU HÌNH
========================================================= */

const ROOM_LIST_PATH = path_name.room; // "/quan-tri/phong"
const contractPath = (id) => `${path_name.contract}/${id}`;
const tenantPath = (id) => `${path_name.tenant}/${id}`;
const CONTRACT_CREATE_PATH = `${path_name.contract}/them-moi`;

// Nhãn tiếng Việt (không dùng constants/labels)
const STATUS_LABEL_MAP = {
  AVAILABLE: "Phòng trống",
  OCCUPIED: "Đang thuê",
  MAINTENANCE: "Bảo trì",
  RESERVED: "Đã đặt",
};

const ROOM_TYPE_LABEL_MAP = {
  STANDARD: "Phòng thường",
  LOFT: "Phòng gác lửng",
  STUDIO: "Studio",
  MINI_APARTMENT: "Căn hộ mini",
};

// Màu chấm + nền của trạng thái phòng (giống trang danh sách)
const STATUS_TONE_MAP = {
  OCCUPIED: "green",
  AVAILABLE: "orange",
  MAINTENANCE: "red",
  RESERVED: "blue",
};

const StatusPill = ({ value, children }) => (
  <span className={`room-pill room-pill--${STATUS_TONE_MAP[value] || "gray"}`}>
    <i />
    {children}
  </span>
);

// Quyền thao tác theo trạng thái phòng
//  - Xóa: chỉ khi phòng trống hoặc đang bảo trì
//  - Chuyển bảo trì: chỉ khi phòng trống
//  - Hoàn tất bảo trì: chỉ khi đang bảo trì
const DELETE_BLOCK_REASON = {
  OCCUPIED: "Phòng đang có người thuê, không thể xóa",
  RESERVED: "Phòng đã được đặt, không thể xóa",
};

const formatDateTime = (value) =>
  value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—";

/* =========================================================
   BỘ ẢNH PHÒNG
========================================================= */

function RoomGallery({ images = [], roomNumber }) {
  const [active, setActive] = useState(0);

  const total = images.length;
  const currentIndex = Math.min(active, Math.max(total - 1, 0));
  const current = images[currentIndex];

  useEffect(() => {
    setActive(0);
  }, [images]);

  if (!total) {
    return (
      <div className="room-gallery__empty">
        <HomeOutlined />
        <span>Phòng chưa có ảnh</span>
      </div>
    );
  }

  return (
    <div className="room-gallery">
      <div className="room-gallery__main">
        <Image
          key={current.id ?? current.imageUrl}
          src={current.imageUrl}
          alt={`Ảnh phòng ${roomNumber}`}
          preview={{ src: current.imageUrl }}
        />

        {current.isThumbnail && (
          <span className="room-gallery__badge">Ảnh đại diện</span>
        )}

        <span className="room-gallery__count">
          {currentIndex + 1} / {total}
        </span>

        {total > 1 && (
          <>
            <Button
              shape="circle"
              size="large"
              icon={<LeftOutlined />}
              aria-label="Ảnh trước"
              className="room-gallery__nav room-gallery__nav--prev"
              onClick={() => setActive((index) => (index + total - 1) % total)}
            />

            <Button
              shape="circle"
              size="large"
              icon={<RightOutlined />}
              aria-label="Ảnh sau"
              className="room-gallery__nav room-gallery__nav--next"
              onClick={() => setActive((index) => (index + 1) % total)}
            />
          </>
        )}
      </div>

      {total > 1 && (
        <div className="room-gallery__thumbs">
          {images.map((image, index) => (
            <button
              key={image.id ?? image.imageUrl ?? index}
              type="button"
              aria-label={`Xem ảnh ${index + 1}`}
              aria-pressed={index === currentIndex}
              className={
                index === currentIndex
                  ? "room-gallery__thumb is-active"
                  : "room-gallery__thumb"
              }
              onClick={() => setActive(index)}
            >
              <img src={image.imageUrl} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PHẦN THÔNG TIN LIÊN QUAN (hợp đồng, người ở, hóa đơn, sự cố, điện nước)
========================================================= */

const fmtDate = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");
const money = (v) => (v != null ? formatCurrency(v, true) : "—");
const fmtNum = (v) => (v != null ? Number(v).toLocaleString("vi-VN") : "—");
const diff = (a, b) =>
  a != null && b != null ? Math.max(Number(b) - Number(a), 0) : null;

const INVOICE_STATUS = {
  PAID: { label: "Đã thanh toán", color: "success" },
  UNPAID: { label: "Chưa thanh toán", color: "error" },
  OVERDUE: { label: "Quá hạn", color: "error" },
  PARTIALLY_PAID: { label: "Thanh toán một phần", color: "warning" },
};

const ISSUE_STATUS = {
  PENDING: { label: "Chờ tiếp nhận", color: "warning" },
  ACCEPTED: { label: "Đã tiếp nhận", color: "processing" },
  IN_PROGRESS: { label: "Đang xử lý", color: "processing" },
  COMPLETED: { label: "Hoàn tất", color: "success" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const CardTitle = ({ children, extra }) => (
  <Flex
    align="center"
    justify="space-between"
    gap={12}
    wrap="wrap"
    style={{ width: "100%" }}
  >
    <span className="room-title">{children}</span>
    {extra}
  </Flex>
);

function MaintenanceBanner({ show, loading, onFinish }) {
  if (!show) return null;
  return (
    <div className="room-banner">
      <span className="room-banner__icon">
        <ToolOutlined />
      </span>
      <div className="room-banner__body">
        <b>Phòng đang bảo trì, chưa thể cho thuê</b>
        <span>
          Hoàn tất các yêu cầu sửa chữa bên dưới rồi mở lại phòng để chuyển về
          trạng thái "Phòng trống".
        </span>
      </div>
    </div>
  );
}

/* ---------- Người đang ở ---------- */
function TenantsCard({
  room,
  tenants,
  onAddTenant,
  onCreateContract,
  onViewTenant,
}) {
  const isOcc = room.status === "OCCUPIED";
  const isAvail = room.status === "AVAILABLE";
  const max = room.maxOccupancy || 0;
  const percent = max
    ? Math.min(Math.round((tenants.length / max) * 100), 100)
    : 0;
  const isFull = max > 0 && tenants.length >= max;

  return (
    <MyCard
      title={
        <CardTitle
          extra={
            isOcc && (
              <Button
                icon={<PlusOutlined />}
                disabled={isFull}
                onClick={onAddTenant}
              >
                Thêm người ở
              </Button>
            )
          }
        >
          Người đang ở
        </CardTitle>
      }
    >
      {isOcc && tenants.length > 0 ? (
        <Flex vertical gap={8}>
          <Flex justify="space-between">
            <span className="room-muted">Số người đang ở</span>
            <b>
              {tenants.length} / {max} người
            </b>
          </Flex>
          <Progress
            percent={percent}
            showInfo={false}
            strokeColor={{ from: "#536ee7", to: "#7c93ff" }}
          />
          <div className="room-list">
            {tenants.map((p) => (
              <div key={p.id} className="room-row">
                <Avatar size={46} className="room-avatar">
                  {initialsOf(p.fullName)}
                </Avatar>
                <div className="room-row__main">
                  <Flex align="center" gap={8} wrap="wrap">
                    <b>{p.fullName}</b>
                    <Tag
                      color={p.isPrimary ? "blue" : "default"}
                      bordered={false}
                    >
                      {p.isPrimary ? "Người đại diện hợp đồng" : "Người ở cùng"}
                    </Tag>
                  </Flex>
                  <span className="room-muted">
                    {p.phone || "—"} · Vào ở từ {fmtDate(p.moveInDate)}
                  </span>
                </div>
                <Button type="link" onClick={() => onViewTenant(p)}>
                  Xem hồ sơ
                </Button>
              </div>
            ))}
          </div>
        </Flex>
      ) : (
        <div className="room-empty">
          <span className="room-empty__icon">
            <TeamOutlined />
          </span>
          <b>
            {isAvail
              ? "Phòng đang trống"
              : isOcc
                ? "Chưa có thông tin người ở"
                : "Phòng đang bảo trì"}
          </b>
          <span className="room-muted">
            {isAvail
              ? "Chưa có ai ở trong phòng này. Tạo hợp đồng thuê để thêm người thuê vào phòng."
              : isOcc
                ? "Phòng đang thuê nhưng chưa có danh sách người ở."
                : 'Phòng đang sửa chữa nên chưa có người ở. Chuyển về "Còn trống" sau khi hoàn tất bảo trì.'}
          </span>
          {isAvail && (
            <Button type="primary" onClick={onCreateContract}>
              Tạo hợp đồng thuê
            </Button>
          )}
        </div>
      )}
    </MyCard>
  );
}

/* ---------- Hóa đơn gần đây ---------- */
function InvoicesCard({ invoices, unpaidTotal, onViewAll }) {
  return (
    <MyCard
      title={
        <CardTitle
          extra={
            <Button type="link" onClick={onViewAll}>
              Xem tất cả
            </Button>
          }
        >
          Hóa đơn gần đây
        </CardTitle>
      }
    >
      {invoices.length ? (
        <>
          <div className="room-list">
            {invoices.map((v) => {
              const st = INVOICE_STATUS[v.status] || {
                label: v.status,
                color: "default",
              };
              const note =
                v.status === "PAID"
                  ? "Đã thanh toán đủ"
                  : v.status === "PARTIALLY_PAID"
                    ? `Còn nợ ${money(v.remainingAmount)} · hạn ${fmtDate(v.dueDate)}`
                    : v.dueDate
                      ? `Hạn thanh toán ${fmtDate(v.dueDate)}`
                      : "";
              return (
                <div key={v.id} className="room-row">
                  <span className="room-row__icon">
                    <FileTextOutlined />
                  </span>
                  <div className="room-row__main">
                    <b>
                      Hóa đơn tháng {v.billingMonth}/{v.billingYear}
                    </b>
                    <span className="room-muted">{note}</span>
                  </div>
                  <Flex vertical align="flex-end" gap={6}>
                    <b className="room-num">{money(v.totalAmount)}</b>
                    <Tag
                      color={st.color}
                      bordered={false}
                      style={{ margin: 0 }}
                    >
                      {st.label}
                    </Tag>
                  </Flex>
                </div>
              );
            })}
          </div>
          <div className="room-debt">
            <span className="room-muted">Tổng công nợ của phòng</span>
            <b className={Number(unpaidTotal) > 0 ? "is-danger" : "is-success"}>
              {money(unpaidTotal || 0)}
            </b>
          </div>
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Phòng chưa có hóa đơn nào"
        />
      )}
    </MyCard>
  );
}

/* ---------- Yêu cầu sửa chữa ---------- */
function RepairsCard({ issues, onViewAll }) {
  return (
    <MyCard
      title={
        <CardTitle
          extra={
            <Button type="link" onClick={onViewAll}>
              Xem tất cả
            </Button>
          }
        >
          Yêu cầu sửa chữa
        </CardTitle>
      }
    >
      {issues.length ? (
        <div className="room-list">
          {issues.map((r) => {
            const st = ISSUE_STATUS[r.status] || {
              label: r.status,
              color: "default",
            };
            const meta =
              r.status === "COMPLETED"
                ? `Gửi ${fmtDate(r.createdAt)} · hoàn tất ${fmtDate(r.updatedAt)}`
                : `${r.tenantName || "Gửi"} · ${fmtDate(r.createdAt)}`;
            return (
              <div key={r.id} className="room-row">
                <span className="room-row__icon room-row__icon--warn">
                  <ToolOutlined />
                </span>
                <div className="room-row__main">
                  <b>{r.title}</b>
                  <span className="room-muted">{meta}</span>
                </div>
                <Tag color={st.color} bordered={false} style={{ margin: 0 }}>
                  {st.label}
                </Tag>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Phòng chưa có yêu cầu sửa chữa nào"
        />
      )}
    </MyCard>
  );
}

/* ---------- Hợp đồng hiện tại ---------- */
function ContractCard({
  room,
  contract: c,
  lastContract: last,
  onViewContract,
}) {
  const isAvail = room.status === "AVAILABLE";

  if (!c) {
    return (
      <MyCard title={<CardTitle>Hợp đồng hiện tại</CardTitle>}>
        <p className="room-muted" style={{ margin: "0 0 8px" }}>
          {isAvail
            ? "Phòng chưa có hợp đồng đang hiệu lực."
            : "Hợp đồng bị tạm ngưng trong thời gian bảo trì."}
        </p>
        {isAvail && last && (
          <dl className="room-dl">
            <div>
              <dt>Lần thuê gần nhất</dt>
              <dd>
                <a onClick={() => onViewContract(last)}>{last.contractCode}</a>
              </dd>
            </div>
            <div>
              <dt>Thời gian thuê</dt>
              <dd>
                {fmtDate(last.startDate)} -{" "}
                {fmtDate(last.actualEndDate || last.endDate)}
              </dd>
            </div>
            <div>
              <dt>Kết thúc</dt>
              <dd>Đã kết thúc, đã trả phòng</dd>
            </div>
          </dl>
        )}
      </MyCard>
    );
  }

  const total = Math.max(dayjs(c.endDate).diff(dayjs(c.startDate), "day"), 1);
  const passed = Math.min(
    Math.max(dayjs().diff(dayjs(c.startDate), "day"), 0),
    total,
  );
  const percent = Math.round((passed / total) * 100);
  const left = Math.max(dayjs(c.endDate).diff(dayjs(), "day"), 0);

  return (
    <MyCard title={<CardTitle>Hợp đồng hiện tại</CardTitle>}>
      <div className="room-progress-box">
        <Flex justify="space-between" gap={12}>
          <span className="room-muted">Đã trải qua {percent}% thời hạn</span>
          <b style={{ color: "#3b4bcb" }}>Còn {left} ngày</b>
        </Flex>
        <Progress
          percent={percent}
          showInfo={false}
          strokeColor={{ from: "#2bb6cc", to: "#4a5be0" }}
        />
      </div>
      <dl className="room-dl">
        <div>
          <dt>Mã hợp đồng</dt>
          <dd>
            <a onClick={() => onViewContract(c)}>{c.contractCode}</a>
          </dd>
        </div>
        <div>
          <dt>Thời hạn</dt>
          <dd>
            {fmtDate(c.startDate)} - {fmtDate(c.endDate)}
          </dd>
        </div>
        <div>
          <dt>Giá thuê chốt</dt>
          <dd>{money(c.rentPrice)} / tháng</dd>
        </div>
        <div>
          <dt>Tiền cọc</dt>
          <dd>{money(c.deposit)}</dd>
        </div>
        <div>
          <dt>Kỳ thanh toán</dt>
          <dd>
            {c.paymentDueDay ? `Ngày ${c.paymentDueDay} hàng tháng` : "—"}
          </dd>
        </div>
      </dl>
      <Button block onClick={() => onViewContract(c)} style={{ marginTop: 12 }}>
        Xem hợp đồng
      </Button>
    </MyCard>
  );
}

/* ---------- Điện nước gần nhất ---------- */
function MeterCard({ meter: m }) {
  return (
    <MyCard title={<CardTitle>Điện nước gần nhất</CardTitle>}>
      {m ? (
        <Flex vertical gap={14}>
          <div className="room-meter">
            <div className="room-meter__box room-meter__box--elec">
              <span className="room-meter__label">
                <ThunderboltOutlined /> Điện
              </span>
              <b className="room-meter__value">
                {diff(m.electricityStart, m.electricityEnd) ?? "—"}{" "}
                <small>kWh</small>
              </b>
              <span className="room-muted">
                {fmtNum(m.electricityStart)} → {fmtNum(m.electricityEnd)}
              </span>
            </div>
            <div className="room-meter__box room-meter__box--water">
              <span className="room-meter__label">
                <ExperimentOutlined /> Nước
              </span>
              <b className="room-meter__value">
                {diff(m.waterStart, m.waterEnd) ?? "—"} <small>m³</small>
              </b>
              <span className="room-muted">
                {fmtNum(m.waterStart)} → {fmtNum(m.waterEnd)}
              </span>
            </div>
          </div>
          <span className="room-muted">
            Kỳ {m.billingMonth}/{m.billingYear} · ghi ngày{" "}
            {fmtDate(m.recordedDate)}
          </span>
        </Flex>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có chỉ số điện nước"
        />
      )}
    </MyCard>
  );
}

/* =========================================================
   TRANG CHI TIẾT PHÒNG
========================================================= */

const RoomDetailPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { notify, contextHolder } = useNotify();
  const [modal, modalContextHolder] = Modal.useModal();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);

  const [buildings, setBuildings] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);

  /* ---------------------------------------------------------
     TẢI CHI TIẾT PHÒNG
  --------------------------------------------------------- */

  const fetchRoom = useCallback(async () => {
    if (!roomId) {
      setRoom(null);
      setErrorStatus(404);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorStatus(null);

    try {
      const data = await getRoomById(roomId);

      if (!data) {
        setRoom(null);
        setErrorStatus(404);
        return;
      }

      setRoom(data);
    } catch (error) {
      console.error("Lấy chi tiết phòng thất bại:", error);
      setRoom(null);
      setErrorStatus(error?.response?.status === 404 ? 404 : "error");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  /* ---------------------------------------------------------
     TẢI TÒA NHÀ CHO FORM CHỈNH SỬA
  --------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    getBuildingOptions()
      .then((data) => {
        if (!cancelled) {
          setBuildings(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBuildings([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------
     SẮP XẾP ẢNH: ẢNH ĐẠI DIỆN ĐỨNG ĐẦU
  --------------------------------------------------------- */

  const images = useMemo(() => {
    const roomImages = Array.isArray(room?.images) ? room.images : [];

    return [...roomImages].sort(
      (a, b) => Number(Boolean(b.isThumbnail)) - Number(Boolean(a.isThumbnail)),
    );
  }, [room?.images]);

  /* ---------------------------------------------------------
     THAO TÁC PHÒNG
  --------------------------------------------------------- */

  const handleDelete = () => {
    modal.confirm({
      title: "Xóa phòng",
      icon: <WarningOutlined />,
      content: `Bạn có chắc chắn muốn xóa phòng ${room?.roomNumber || ""}?`,
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },

      onOk: async () => {
        try {
          await deleteRoom(room.id);

          notify({
            type: "success",
            message: "Xóa phòng thành công!",
          });

          navigate(ROOM_LIST_PATH);
        } catch (error) {
          notify({
            type: "error",
            message: "Xóa phòng thất bại!",
            description:
              error?.response?.data?.message ||
              "Không thể xóa phòng này. Hãy kiểm tra dữ liệu liên quan.",
          });

          throw error;
        }
      },
    });
  };

  // Chuyển phòng trống sang bảo trì, hoặc hoàn tất bảo trì để phòng trống lại
  const handleToggleMaintenance = () => {
    const toMaintenance = room.status === "AVAILABLE";

    modal.confirm({
      title: toMaintenance
        ? `Chuyển phòng ${room.roomNumber} sang bảo trì?`
        : `Hoàn tất bảo trì phòng ${room.roomNumber}?`,
      icon: toMaintenance ? <PauseCircleOutlined /> : <PlayCircleOutlined />,
      content: toMaintenance
        ? "Phòng sẽ không xuất hiện trong danh sách phòng trống để cho thuê cho đến khi hoàn tất bảo trì."
        : "Phòng sẽ trở về trạng thái trống và có thể cho thuê lại.",
      okText: toMaintenance ? "Chuyển bảo trì" : "Hoàn tất bảo trì",
      cancelText: "Hủy",
      okButtonProps: { loading: statusLoading },

      onOk: async () => {
        setStatusLoading(true);

        try {
          await updateRoomMaintenance(room.id, toMaintenance);

          notify({
            type: "success",
            message: toMaintenance
              ? "Đã chuyển phòng sang bảo trì!"
              : "Đã hoàn tất bảo trì, phòng trống trở lại!",
          });

          await fetchRoom();
        } catch (error) {
          notify({
            type: "error",
            message: "Cập nhật trạng thái phòng thất bại!",
            description:
              error?.response?.data?.message ||
              "Vui lòng kiểm tra trạng thái phòng và hợp đồng liên quan.",
          });

          throw error;
        } finally {
          setStatusLoading(false);
        }
      },
    });
  };

  /* ---------------------------------------------------------
     TRẠNG THÁI TẢI VÀ LỖI
  --------------------------------------------------------- */

  if (loading && !room) {
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

  if (errorStatus || !room) {
    return (
      <Fragment>
        {contextHolder}
        {modalContextHolder}
        <MyCard>
          <Result
            status={errorStatus === 404 ? "404" : "error"}
            title={
              errorStatus === 404
                ? "Không tìm thấy phòng"
                : "Không tải được thông tin phòng"
            }
            subTitle={
              errorStatus === 404
                ? "Phòng này không tồn tại hoặc đã bị xóa."
                : "Vui lòng kiểm tra kết nối đến máy chủ rồi thử lại."
            }
            extra={[
              <Button key="back" onClick={() => navigate(ROOM_LIST_PATH)}>
                Về danh sách phòng
              </Button>,
              errorStatus !== 404 && (
                <Button key="retry" type="primary" onClick={fetchRoom}>
                  Thử lại
                </Button>
              ),
            ]}
          />
        </MyCard>
      </Fragment>
    );
  }

  /* ---------------------------------------------------------
     DỮ LIỆU HIỂN THỊ
  --------------------------------------------------------- */

  const statusLabel = STATUS_LABEL_MAP[room.status] || room.status || "—";

  const typeLabel = ROOM_TYPE_LABEL_MAP[room.roomType] || room.roomType || "—";

  const buildingName = room.buildingName || room.building?.name || "—";

  const tenants = room.currentTenants || [];
  const invoices = room.recentInvoices || [];
  const issues = room.recentIssues || [];

  // Chỉ hiện thông tin người thuê khi phòng đang có người thuê.
  // AVAILABLE là trạng thái phòng trống trong hệ thống.
  const isRoomOccupied = room.status === "OCCUPIED";

  const goContract = (contract) => navigate(contractPath(contract.id));

  const statusTag = <StatusPill value={room.status}>{statusLabel}</StatusPill>;

  const canDelete = !DELETE_BLOCK_REASON[room.status];
  const canMaintain = room.status === "AVAILABLE";
  const canFinishMaintenance = room.status === "MAINTENANCE";

  const infoItems = [
    {
      key: "roomNumber",
      label: "Mã phòng",
      children: room.roomNumber || "—",
    },
    {
      key: "building",
      label: "Tòa nhà",
      children: buildingName,
    },
    {
      key: "type",
      label: "Loại phòng",
      children: typeLabel,
    },
    {
      key: "floor",
      label: "Tầng",
      children: room.floor != null ? `Tầng ${room.floor}` : "—",
    },
    {
      key: "area",
      label: "Diện tích",
      children: room.area != null ? `${room.area} m²` : "—",
    },
    {
      key: "occupancy",
      label: "Sức chứa tối đa",
      children: room.maxOccupancy != null ? `${room.maxOccupancy} người` : "—",
    },
    {
      key: "status",
      label: "Trạng thái",
      children: statusTag,
    },
  ];

  const systemItems = [
    {
      key: "id",
      label: "Mã hệ thống",
      children: `#${room.id}`,
    },
    {
      key: "createdAt",
      label: "Ngày tạo",
      children: formatDateTime(room.createdAt),
    },
    {
      key: "updatedAt",
      label: "Cập nhật lần cuối",
      children: formatDateTime(room.updatedAt),
    },
  ];

  /* ---------------------------------------------------------
     GIAO DIỆN
  --------------------------------------------------------- */

  return (
    <Fragment>
      {contextHolder}
      {modalContextHolder}

      <div className="room-detail">
        {/* Tiêu đề và thao tác */}
        <div className="room-detail__header">
          <Flex align="center" gap={14} className="room-detail__heading">
            <Button
              icon={<ArrowLeftOutlined />}
              aria-label="Quay lại danh sách phòng"
              onClick={() => navigate(ROOM_LIST_PATH)}
            />

            <div style={{ minWidth: 0 }}>
              <Flex align="center" wrap="wrap" gap={10}>
                <h1 className="room-detail__title">Phòng {room.roomNumber}</h1>
                {statusTag}
              </Flex>

              <Text type="secondary">
                {buildingName} · Tầng {room.floor ?? "—"} · {typeLabel}
              </Text>
            </div>
          </Flex>

          <div className="room-detail__actions">
            {canMaintain && (
              <Button
                icon={<PauseCircleOutlined />}
                onClick={handleToggleMaintenance}
              >
                Chuyển bảo trì
              </Button>
            )}

            {canFinishMaintenance && (
              <Button
                icon={<PlayCircleOutlined />}
                onClick={handleToggleMaintenance}
              >
                Hoàn tất bảo trì
              </Button>
            )}

            {room.status !== "OCCUPIED" && (
              <Tooltip title={DELETE_BLOCK_REASON[room.status]}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!canDelete}
                  onClick={handleDelete}
                >
                  Xóa phòng
                </Button>
              </Tooltip>
            )}

            <Button
              type="primary"
              icon={<FormOutlined />}
              onClick={() => setEditOpen(true)}
            >
              Chỉnh sửa
            </Button>
          </div>
        </div>

        <Flex vertical gap={24} className="room-detail__top">
          <MaintenanceBanner
            show={room.status === "MAINTENANCE"}
            loading={statusLoading}
            onFinish={handleToggleMaintenance}
          />
        </Flex>

        <Row gutter={[24, 24]}>
          {/* Cột trái: ảnh, người thuê, hóa đơn, sự cố và mô tả */}
          <Col xs={24} lg={15} xl={16}>
            <Flex vertical gap={24}>
              <MyCard
                title={<span className="room-title">Hình ảnh phòng</span>}
              >
                <RoomGallery images={images} roomNumber={room.roomNumber} />
              </MyCard>

              {/* Chỉ hiện khi phòng đang có người thuê */}
              {isRoomOccupied && (
                <TenantsCard
                  room={room}
                  tenants={tenants}
                  onAddTenant={() =>
                    room.currentContract &&
                    navigate(contractPath(room.currentContract.id))
                  }
                  onCreateContract={() => navigate(CONTRACT_CREATE_PATH)}
                  onViewTenant={(p) => navigate(tenantPath(p.id))}
                />
              )}

              {/* Chỉ hiện hóa đơn khi phòng đang có người thuê */}
              {isRoomOccupied && (
                <InvoicesCard
                  invoices={invoices}
                  unpaidTotal={room.unpaidTotal}
                  onViewAll={() => navigate(path_name.invoice)}
                />
              )}

              {/* Lịch sử sự cố vẫn được giữ khi phòng trống */}
              <RepairsCard
                issues={issues}
                onViewAll={() => navigate(path_name.issue)}
              />

              <MyCard title={<span className="room-title">Mô tả</span>}>
                {room.description ? (
                  <Paragraph className="room-detail__description">
                    {room.description}
                  </Paragraph>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa có mô tả"
                  />
                )}
              </MyCard>
            </Flex>
          </Col>

          {/* Cột phải: thông tin phòng và các thông tin liên quan */}
          <Col xs={24} lg={9} xl={8}>
            <Flex vertical gap={24}>
              <MyCard
                title={<span className="room-title">Thông tin phòng</span>}
              >
                <div className="room-detail__price">
                  <span className="room-detail__price-label">Giá thuê</span>

                  <span className="room-detail__price-value">
                    {room.rentalPrice != null
                      ? formatCurrency(room.rentalPrice, true)
                      : "—"}
                    <small> / tháng</small>
                  </span>
                </div>

                <Descriptions
                  bordered
                  column={1}
                  size="small"
                  items={infoItems}
                  className="room-detail__desc"
                />
              </MyCard>

              {/* Chỉ hiện hợp đồng khi phòng đang có người thuê */}
              {isRoomOccupied && (
                <ContractCard
                  room={room}
                  contract={room.currentContract}
                  lastContract={room.lastContract}
                  onViewContract={goContract}
                />
              )}

              {/* Chỉ hiện điện nước khi phòng đang có người thuê */}
              {isRoomOccupied && <MeterCard meter={room.latestMeterReading} />}

              <MyCard title={<span className="room-title">Tiện nghi</span>}>
                {room.amenities?.length ? (
                  <Flex wrap="wrap" gap={10}>
                    {room.amenities.map((item) => (
                      <div
                        key={item.id ?? item.name}
                        className="room-detail__amenity-item"
                      >
                        <CheckCircleFilled className="room-detail__amenity-icon" />
                        <span className="room-detail__amenity-name">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </Flex>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa có thông tin tiện nghi"
                  />
                )}
              </MyCard>

              <MyCard
                title={<span className="room-title">Thông tin hệ thống</span>}
              >
                <Descriptions
                  bordered
                  column={1}
                  size="small"
                  items={systemItems}
                  className="room-detail__desc"
                />
              </MyCard>
            </Flex>
          </Col>
        </Row>
      </div>

      {/* Chỉnh sửa phòng */}
      {editOpen && (
        <RoomForm
          isMode="edit"
          record={room}
          hideModal={() => setEditOpen(false)}
          isModal={editOpen}
          fetchRooms={fetchRoom}
          notify={notify}
          loadDashboard={() => {}}
          buildings={buildings}
        />
      )}
    </Fragment>
  );
};

export default RoomDetailPage;
