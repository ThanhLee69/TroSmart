import { useEffect, useState } from "react";
import {
  Card,
  Empty,
  Result,
  Spin,
  Typography,
  Row,
  Col,
  Grid,
  Breadcrumb,
  Button,
  Divider,
  Avatar,
  Image,
} from "antd";
import {
  UserOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  CompassOutlined,
  CameraOutlined,
  PictureOutlined,
  ExpandOutlined,
  ApartmentOutlined,
  TeamOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { getPublicRoomDetail, getSimilarRooms } from "../../../api/publicApi";
import PublicRoomCard, {
  PublicRoomCardSkeleton,
  ROOM_COL_PROPS,
} from "../../../components/PublicRoomCard";
import RoomContactCard from "./RoomContactCard";
import { path_name } from "../../../constants/path_name";
import "./RoomDetail.css";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// Số phòng tương tự hiển thị (khớp 4 cột của ROOM_COL_PROPS)
const SIMILAR_LIMIT = 4;

// Nhãn hiển thị cho RoomType. Giá trị lạ sẽ hiện nguyên mã.
// Đổi key cho đúng enum RoomType của backend.
const ROOM_TYPE_LABEL = {
  STUDIO: "Studio",
  LOFT: "Phòng có gác",
  STANDARD: "Phòng thường",
  MINI_APARTMENT: "Chung cư mini",
};

/**
 * Bộ ảnh phòng.
 * images: mảng url ảnh, ảnh đầu tiên là ảnh đại diện (API đã xếp sẵn).
 * Dùng key={room.id} ở chỗ gọi để tự quay về ảnh đầu khi đổi phòng.
 */
function RoomGallery({ images = [], roomName = "phòng trọ" }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="room-gallery">
        <div className="room-gallery__main">
          <div className="room-gallery__empty">
            <PictureOutlined />
            <span>Phòng chưa có ảnh</span>
          </div>
        </div>
      </div>
    );
  }

  const activeSrc = images[activeIndex] ?? images[0];

  return (
    <div className="room-gallery">
      {/* Ảnh chính */}
      <div className="room-gallery__main">
        <Image
          src={activeSrc}
          alt={`Ảnh ${activeIndex + 1} của ${roomName}`}
          className="room-gallery__main-image"
          preview={{
            mask: "Xem ảnh lớn",
          }}
        />

        <div className="room-gallery__counter">
          <CameraOutlined />
          <span>
            {activeIndex + 1}/{images.length} ảnh
          </span>
        </div>
      </div>

      {/* Ảnh thu nhỏ */}
      {images.length > 1 && (
        <div className="room-gallery__thumbnails">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              className={`room-gallery__thumbnail ${
                activeIndex === index ? "room-gallery__thumbnail--active" : ""
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Xem ảnh ${index + 1}`}
            >
              <img src={src} alt={`Ảnh ${index + 1} của ${roomName}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoomDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const screens = useBreakpoint();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);

  // Phòng tương tự (GET /public/rooms/{id}/similar)
  const [similarRooms, setSimilarRooms] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      setFailed(false);

      try {
        const data = await getPublicRoomDetail(id);
        if (!cancelled) setRoom(data);
      } catch (error) {
        if (cancelled) return;
        setRoom(null);

        if (error?.response?.status === 404) setNotFound(true);
        else setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    window.scrollTo({ top: 0 });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Phòng tương tự: tải lại khi chuyển sang phòng khác.
  // Gọi API lỗi hoặc không có phòng nào thì ẩn mục này, không ảnh hưởng trang chi tiết.
  useEffect(() => {
    if (!id) return undefined;

    let cancelled = false;

    const loadSimilar = async () => {
      setSimilarLoading(true);

      try {
        const data = await getSimilarRooms(id, SIMILAR_LIMIT);
        if (!cancelled) setSimilarRooms(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Lấy phòng tương tự thất bại:", error);
        if (!cancelled) setSimilarRooms([]);
      } finally {
        if (!cancelled) setSimilarLoading(false);
      }
    };

    loadSimilar();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="room-detail-page">
        <div
          className="room-detail-container"
          style={{ textAlign: "center", padding: "120px 0" }}
        >
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="room-detail-page">
        <div className="room-detail-container">
          <Result
            status={notFound ? "404" : "error"}
            title={
              notFound
                ? "Không tìm thấy phòng"
                : "Không thể tải thông tin phòng"
            }
            subTitle={
              notFound
                ? "Phòng không tồn tại hoặc đã có người thuê."
                : "Vui lòng thử lại sau."
            }
            extra={
              <Button
                type="primary"
                onClick={() => navigate(path_name.roomSearch)}
              >
                Xem các phòng khác
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const roomTitle = `Phòng ${room.roomNumber}`;
  const fullAddress = [room.address, room.ward, room.province]
    .filter(Boolean)
    .join(", ");

  // Có tọa độ thì ghim đúng vị trí, không thì tìm theo địa chỉ
  const hasCoords = room.latitude != null && room.longitude != null;
  const mapQuery = hasCoords
    ? `${room.latitude},${room.longitude}`
    : fullAddress;

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    mapQuery,
  )}&output=embed`;

  const directionUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    mapQuery,
  )}`;

  // 4 thông tin nhanh của phòng
  const roomFacts = [
    {
      label: "Diện tích",
      value: room.area ?? "—",
      suffix: room.area != null ? "m²" : null,
      icon: <ExpandOutlined />,
      from: "#6b82f2",
      to: "#4a5be0",
    },
    {
      label: "Tầng",
      value: room.floor ?? "—",
      icon: <ApartmentOutlined />,
      from: "#a08cf7",
      to: "#6756d9",
    },
    {
      label: "Sức chứa",
      value: room.maxOccupancy ?? "—",
      suffix: room.maxOccupancy != null ? "người" : null,
      icon: <TeamOutlined />,
      from: "#3ec5a5",
      to: "#159f83",
    },
    {
      label: "Giá thuê",
      value:
        room.rentalPrice != null
          ? `${new Intl.NumberFormat("vi-VN").format(room.rentalPrice)}đ`
          : "Liên hệ",
      suffix: room.rentalPrice != null ? "/ tháng" : null,
      icon: <DollarOutlined />,
      from: "#f7b868",
      to: "#d9801c",
    },
  ];

  const roomAmenities = room.amenities ?? [];
  const buildingAmenities = room.buildingAmenities ?? [];

  const breadcrumbItems = [
    {
      title: (
        <span
          className="room-detail-breadcrumb__link"
          onClick={() => navigate("/")}
        >
          Trang chủ
        </span>
      ),
    },
    {
      title: (
        <span
          className="room-detail-breadcrumb__link"
          onClick={() => navigate(path_name.roomSearch)}
        >
          Tìm phòng
        </span>
      ),
    },
    {
      title: (
        <Text className="room-detail-breadcrumb__current">{roomTitle}</Text>
      ),
    },
  ];

  const renderAmenities = (items, type, columnProps) =>
    items.length === 0 ? (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Chưa có thông tin"
      />
    ) : (
      <Row gutter={[12, 16]}>
        {items.map((item) => (
          <Col key={item} {...columnProps}>
            <div className="room-detail-amenities__item">
              <CheckCircleFilled
                className={`room-detail-amenities__check room-detail-amenities__check--${type}`}
              />

              <Text className="room-detail-amenities__name">{item}</Text>
            </div>
          </Col>
        ))}
      </Row>
    );

  return (
    <div className="room-detail-page">
      <div className="room-detail-container">
        {/* Breadcrumb */}
        <Breadcrumb
          className="room-detail-breadcrumb"
          items={breadcrumbItems}
          separator="/"
        />

        {/* Tiêu đề và địa chỉ phòng */}
        <div className="room-detail-heading">
          <div className="room-detail-heading__info">
            <div className="room-detail-heading__top">
              <Title level={2} className="room-detail-heading__title">
                {roomTitle}
              </Title>

              {room.roomType && (
                <span className="room-detail-heading__type">
                  {ROOM_TYPE_LABEL[room.roomType] ?? room.roomType}
                </span>
              )}
            </div>

            <div className="room-detail-heading__address">
              <EnvironmentOutlined className="room-detail-heading__address-icon" />

              <Text className="room-detail-heading__building">
                {room.buildingName}
              </Text>

              <Text className="room-detail-heading__separator">-</Text>

              <Text className="room-detail-heading__location">
                {fullAddress}
              </Text>
            </div>
          </div>

          <Button
            className="room-detail-heading__back"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            size={screens.md ? "large" : "middle"}
          >
            Quay lại kết quả
          </Button>
        </div>

        {/* Ảnh, mô tả, tiện nghi và form đặt lịch */}
        <div className="room-detail-content">
          {/* Cột bên trái */}
          <div className="room-detail-content__gallery">
            <RoomGallery
              key={room.id}
              images={room.imageUrls ?? []}
              roomName={roomTitle}
            />

            {/* Mô tả phòng */}
            <Card className="room-detail-description" bordered={false}>
              <Title level={4} className="room-detail-description__title">
                Mô tả
              </Title>

              <Text className="room-detail-description__content">
                {room.description || "Chủ trọ chưa thêm mô tả cho phòng này."}
              </Text>
            </Card>

            {/* Thông tin phòng */}
            <div className="room-detail-info">
              {roomFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="room-detail-info__item"
                  style={{ "--from": fact.from, "--to": fact.to }}
                >
                  <span className="room-detail-info__icon">{fact.icon}</span>

                  <div className="room-detail-info__text">
                    <span className="room-detail-info__label">
                      {fact.label}
                    </span>
                    <strong className="room-detail-info__value">
                      {fact.value}
                      {fact.suffix && <small>{fact.suffix}</small>}
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Tiện nghi và tiện ích */}
            <Card className="room-detail-amenities" bordered={false}>
              {/* Tiện nghi trong phòng */}

              <div className="room-detail-amenities__section">
                <Title level={4} className="room-detail-amenities__title">
                  Tiện nghi trong phòng
                </Title>

                {renderAmenities(roomAmenities, "room", {
                  xs: 12,
                  sm: 8,
                  md: 6,
                })}
              </div>

              <Divider className="room-detail-amenities__divider" />

              {/* Tiện ích chung của tòa nhà */}
              <div className="room-detail-amenities__section">
                <Title
                  level={4}
                  className="room-detail-amenities__title room-detail-amenities__title--building"
                >
                  Tiện ích chung của tòa nhà
                </Title>

                {renderAmenities(buildingAmenities, "building", {
                  xs: 12,
                  sm: 8,
                  md: 6,
                })}
              </div>
            </Card>
          </div>

          {/* Cột bên phải */}

          <aside className="room-detail-content__contact">
            <RoomContactCard room={room} />

            {/* Thông tin chủ trọ */}
            <Card className="room-detail-landlord" bordered={false}>
              <div className="room-detail-landlord__profile">
                <Avatar
                  size={52}
                  icon={<UserOutlined />}
                  className="room-detail-landlord__avatar"
                />

                <div className="room-detail-landlord__info">
                  <Text className="room-detail-landlord__name">
                    Lê Đăng Thành
                  </Text>

                  <Text className="room-detail-landlord__role">
                    Chủ trọ TroSmart
                  </Text>
                </div>
              </div>
            </Card>
          </aside>
        </div>

        {/* Vị trí phòng: full chiều ngang, cùng bố cục với Phòng tương tự */}
        {mapQuery && (
          <section className="room-detail-location">
            <Title level={2} className="room-detail-location__title">
              Vị trí phòng
            </Title>

            <div className="room-detail-location__map-wrap">
              <iframe
                title="Bản đồ vị trí phòng trọ"
                src={mapUrl}
                className="room-detail-location__map"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="room-detail-location__footer">
              <div className="room-detail-location__place">
                <EnvironmentOutlined className="room-detail-location__icon" />

                <div className="room-detail-location__text">
                  <Text className="room-detail-location__name">
                    {room.buildingName}
                  </Text>
                  <Text className="room-detail-location__address">
                    {fullAddress || "Chưa cập nhật địa chỉ"}
                  </Text>
                </div>
              </div>

              <Button
                type="primary"
                icon={<CompassOutlined />}
                href={directionUrl}
                target="_blank"
                rel="noreferrer"
                className="room-detail-location__direction"
              >
                Chỉ đường
              </Button>
            </div>
          </section>
        )}

        {/* Phòng tương tự */}
        {(similarLoading || similarRooms.length > 0) && (
          <section className="similar-rooms">
            <div className="similar-rooms__heading">
              <div>
                <Title level={2} className="similar-rooms__title">
                  Phòng tương tự
                </Title>

                <Text className="similar-rooms__subtitle">
                  Khám phá thêm những phòng trọ phù hợp với nhu cầu của bạn.
                </Text>
              </div>

              <Button
                className="similar-rooms__view-all"
                onClick={() => navigate(path_name.roomSearch)}
              >
                Xem tất cả phòng
              </Button>
            </div>

            <Row gutter={[20, 24]}>
              {similarLoading
                ? Array.from({ length: SIMILAR_LIMIT }, (_, index) => (
                    <Col {...ROOM_COL_PROPS} key={index}>
                      <PublicRoomCardSkeleton />
                    </Col>
                  ))
                : similarRooms.map((item) => (
                    <Col {...ROOM_COL_PROPS} key={item.id}>
                      <PublicRoomCard room={item} />
                    </Col>
                  ))}
            </Row>
          </section>
        )}
      </div>
    </div>
  );
}
