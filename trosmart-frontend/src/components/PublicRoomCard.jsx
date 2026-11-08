import React from "react";
import { Card, Divider, Skeleton, Space, Tag, Typography } from "antd";
import {
  AimOutlined,
  BuildOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { generatePath, useNavigate } from "react-router-dom";

import { path_name } from "../constants/path_name";
import "./PublicRoomCard.css";

const { Title, Text } = Typography;

// Tên loại phòng hiển thị. Loại nào chưa khai báo thì hiện nguyên giá trị enum.
export const ROOM_TYPE_LABELS = {
  STUDIO: "Studio",
  LOFT: "Phòng có gác",
  STANDARD: "Phòng thường",
  MINI_APARTMENT: "Chung cư mini",
};

// Ảnh mặc định khi phòng chưa có ảnh chính (hoặc link ảnh bị lỗi).
// Là SVG nhúng sẵn nên không cần file ảnh, không phụ thuộc mạng.
export const DEFAULT_ROOM_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <rect width="800" height="500" fill="#eef1ff"/>
      <g fill="none" stroke="#536ee7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity="0.55">
        <path d="M300 250 L400 170 L500 250"/>
        <path d="M320 235 V320 H480 V235"/>
        <path d="M375 320 V270 H425 V320"/>
      </g>
      <text x="400" y="385" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#8a97d8">Chưa có ảnh phòng</text>
    </svg>
  `);

// Số cột gợi ý khi xếp thẻ bằng antd <Col {...ROOM_COL_PROPS}>
export const ROOM_COL_PROPS = { xs: 24, sm: 12, lg: 6 };

const formatPrice = (price) =>
  price == null ? "—" : new Intl.NumberFormat("vi-VN").format(price);

// Địa chỉ hiển thị: "Phường, Tỉnh/Thành phố" (bỏ phần nào bị thiếu)
const getLocation = (room) =>
  [room.ward, room.province].filter(Boolean).join(", ");

/**
 * Thẻ phòng dùng chung: trang chủ, trang tìm phòng, phòng tương tự ở trang chi tiết.
 *
 * Props:
 *  - room          : RoomPublicResponse
 *  - onClick       : (tùy chọn) mặc định chuyển tới trang chi tiết phòng
 *  - showStatus    : hiện nhãn "Còn trống" (mặc định true)
 *  - distanceText  : (tùy chọn) dòng khoảng cách, ví dụ "Cách ĐH GTVT 1,2 km"
 */
function PublicRoomCard({ room, onClick, showStatus = true, distanceText }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(room);
      return;
    }

    navigate(generatePath(path_name.publicRoomDetail, { id: room.id }));
  };

  return (
    <Card
      hoverable
      className="public-room-card"
      onClick={handleClick}
      cover={
        <div className="public-room-card__image-wrapper">
          <img
            src={room.thumbnailUrl || DEFAULT_ROOM_IMAGE}
            alt={`Phòng ${room.roomNumber}`}
            className="public-room-card__image"
            loading="lazy"
            onError={(event) => {
              // Link ảnh hỏng thì chuyển sang ảnh mặc định, tránh lặp vô hạn
              event.currentTarget.onerror = null;
              event.currentTarget.src = DEFAULT_ROOM_IMAGE;
            }}
          />

          {showStatus && (
            <Tag color="success" className="public-room-card__status">
              Còn trống
            </Tag>
          )}
        </div>
      }
    >
      <div className="public-room-card__name-row">
        <Title
          level={5}
          className="public-room-card__name"
          title={`Phòng ${room.roomNumber}`}
        >
          Phòng {room.roomNumber}
        </Title>

        <Tag className="public-room-card__type">
          {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
        </Tag>
      </div>

      <Space
        direction="vertical"
        size={12}
        className="public-room-card__details"
      >
        <Space size={8} className="public-room-card__detail">
          <HiOutlineBuildingOffice2
            style={{ color: "#536ee7", fontSize: 15 }}
          />
          <Text>{room.buildingName}</Text>
        </Space>

        <Space size={8} className="public-room-card__detail">
          <BuildOutlined />
          <Text>Tầng {room.floor}</Text>
          <Text type="secondary">-</Text>
          <Text>{room.area ?? "—"} m²</Text>
          <Text type="secondary">-</Text>
          <Text>Tối đa {room.maxOccupancy} người</Text>
        </Space>

        <Space size={8} className="public-room-card__detail">
          <EnvironmentOutlined />
          <Text>{getLocation(room) || "Chưa cập nhật khu vực"}</Text>
        </Space>

        {distanceText && (
          <Space
            size={8}
            className="public-room-card__detail public-room-card__distance"
          >
            <AimOutlined />
            <Text>{distanceText}</Text>
          </Space>
        )}
      </Space>

      <Divider className="public-room-card__divider" />

      <div className="public-room-card__price">
        <Text className="public-room-card__price-value">
          {formatPrice(room.rentalPrice)}
        </Text>
        <Text className="public-room-card__price-unit">đ/tháng</Text>
      </div>
    </Card>
  );
}

// Khung giữ chỗ cùng kích thước với thẻ phòng (dùng khi đang tải)
export function PublicRoomCardSkeleton() {
  return (
    <Card className="public-room-card">
      <Skeleton.Image
        active
        style={{ width: "100%", height: 160, marginBottom: 16 }}
      />
      <Skeleton active paragraph={{ rows: 3 }} />
    </Card>
  );
}

export default PublicRoomCard;
