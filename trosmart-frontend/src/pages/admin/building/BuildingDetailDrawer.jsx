import React from "react";
import { Button, Drawer, Grid, Popconfirm, Typography } from "antd";
import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  SlackOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import "./BuildingPage.css";

const { Link } = Typography;

const formatDateTime = (value) =>
  value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—";

// Bản đồ xem trước (OpenStreetMap, không cần thư viện)
const MapPreview = ({ lat, lng }) => {
  const dLng = 0.005;
  const dLat = 0.003;

  const src =
    "https://www.openstreetmap.org/export/embed.html" +
    `?bbox=${lng - dLng}%2C${lat - dLat}%2C${lng + dLng}%2C${lat + dLat}` +
    `&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="bf-map">
      <iframe title="Vị trí tòa nhà" src={src} loading="lazy" />
    </div>
  );
};

/**
 * Drawer xem chi tiết tòa nhà (dữ liệu lấy từ dòng đang chọn trong bảng).
 * - onEdit(record): mở form sửa
 * - onDelete(record): xóa tòa nhà
 */
const BuildingDetailDrawer = ({ open, record, onClose, onEdit, onDelete }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  const amenities = record?.amenities ?? [];

  const lat = Number(record?.latitude);
  const lng = Number(record?.longitude);
  const hasCoordinates =
    record?.latitude != null &&
    record?.longitude != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const fullAddress = [record?.address, record?.ward, record?.province]
    .filter(Boolean)
    .join(", ");

  const footer = record ? (
    <div className="bd-actions">
      <Popconfirm
        title="Xóa tòa nhà này?"
        description={`Bạn có chắc chắn muốn xóa "${record.name}"?`}
        okText="Xóa"
        cancelText="Không"
        placement={isMobile ? "top" : "topRight"}
        okButtonProps={{ danger: true }}
        onConfirm={() => onDelete?.(record)}
      >
        <Button danger icon={<DeleteOutlined />}>
          Xóa
        </Button>
      </Popconfirm>

      <Button
        type="primary"
        className="bd-actions__primary"
        icon={<EditOutlined />}
        onClick={() => onEdit?.(record)}
      >
        Chỉnh sửa
      </Button>
    </div>
  ) : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Chi tiết tòa nhà"
      width="min(520px, 100vw)"
      // Điện thoại: kéo từ dưới lên; máy tính: bên phải
      placement={isMobile ? "bottom" : "right"}
      height="92%"
      rootClassName="bd-drawer"
      destroyOnHidden
      footer={footer}
    >
      {record && (
        <div className="bd-detail">
          {/* Đầu trang: tên và địa chỉ */}
          <header className="bd-hero">
            <span className="bd-hero__icon">
              <HomeOutlined />
            </span>

            <div className="bd-hero__text">
              <h2>{record.name}</h2>
              <span>
                <EnvironmentOutlined />
                {fullAddress || "Chưa cập nhật địa chỉ"}
              </span>
            </div>
          </header>

          {/* Thông tin */}
          <section>
            <div className="bd-section-head">
              <h3>Thông tin</h3>
            </div>

            <dl className="bd-info">
              <div className="bd-info__row">
                <dt>Địa chỉ</dt>
                <dd>{record.address || "—"}</dd>
              </div>
              <div className="bd-info__row">
                <dt>Phường/Xã</dt>
                <dd>{record.ward || "—"}</dd>
              </div>
              <div className="bd-info__row">
                <dt>Tỉnh/Thành phố</dt>
                <dd>{record.province || "—"}</dd>
              </div>
              <div className="bd-info__row">
                <dt>Ngày tạo</dt>
                <dd>{formatDateTime(record.createdAt)}</dd>
              </div>
              <div className="bd-info__row">
                <dt>Cập nhật</dt>
                <dd>{formatDateTime(record.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          {/* Mô tả */}
          <section>
            <div className="bd-section-head">
              <h3>Mô tả</h3>
            </div>

            {record.description ? (
              <p className="bd-content">{record.description}</p>
            ) : (
              <p className="bd-empty">Chưa có mô tả.</p>
            )}
          </section>

          {/* Tiện nghi */}
          <section>
            <div className="bd-section-head">
              <h3>Tiện nghi chung</h3>
              <span>{amenities.length} tiện nghi</span>
            </div>

            {amenities.length > 0 ? (
              <div className="bd-amenities">
                {amenities.map((amenity) => (
                  <span className="bd-amenity" key={amenity.id}>
                    <SlackOutlined />
                    {amenity.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="bd-empty">Chưa có tiện nghi nào.</p>
            )}
          </section>

          {/* Vị trí */}
          <section>
            <div className="bd-section-head">
              <h3>Vị trí trên bản đồ</h3>
            </div>

            {hasCoordinates ? (
              <>
                <MapPreview lat={lat} lng={lng} />

                <div className="bd-map-foot">
                  <span>
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </span>

                  <Link
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Mở Google Maps
                  </Link>
                </div>
              </>
            ) : (
              <p className="bd-empty">Chưa có tọa độ cho tòa nhà này.</p>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
};

export default BuildingDetailDrawer;
