import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Col, Empty, Row, Typography } from "antd";
import { useNavigate } from "react-router-dom";

import { getPublicRooms } from "../../../api/publicApi";
import { path_name } from "../../../constants/path_name";
import PublicRoomCard, {
  PublicRoomCardSkeleton,
  ROOM_COL_PROPS,
} from "../../../components/PublicRoomCard";
import "./FeaturedRooms.css";

const { Title, Text } = Typography;

// Số phòng hiển thị ở trang chủ (2 hàng x 4 cột)
const ROOM_LIMIT = 8;

function FeaturedRooms() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const data = await getPublicRooms({ page: 1, size: ROOM_LIMIT });
      setRooms(data?.items ?? []);
    } catch (err) {
      console.error("Lỗi tải phòng trống:", err);
      setRooms([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const renderContent = () => {
    if (loading) {
      return (
        <Row gutter={[20, 24]}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Col {...ROOM_COL_PROPS} key={index}>
              <PublicRoomCardSkeleton />
            </Col>
          ))}
        </Row>
      );
    }

    if (error) {
      return (
        <Alert
          type="error"
          showIcon
          message="Không thể tải danh sách phòng"
          description="Vui lòng kiểm tra kết nối và thử lại."
          action={
            <Button size="small" onClick={fetchRooms}>
              Thử lại
            </Button>
          }
        />
      );
    }

    if (rooms.length === 0) {
      return <Empty description="Hiện chưa có phòng trống" />;
    }

    return (
      <Row gutter={[20, 24]}>
        {rooms.map((room) => (
          <Col {...ROOM_COL_PROPS} key={room.id}>
            <PublicRoomCard room={room} />
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <section className="featured-rooms">
      <div className="featured-rooms__container">
        <div className="featured-rooms__heading">
          <div>
            <Title level={2} className="featured-rooms__title">
              Phòng trống hiện tại
            </Title>

            <Text className="featured-rooms__subtitle">
              Một vài phòng đang sẵn sàng cho thuê ngay.
            </Text>
          </div>

          <Button
            className="featured-rooms__more"
            onClick={() => navigate(path_name.roomSearch)}
          >
            Xem tất cả phòng
          </Button>
        </div>

        {renderContent()}
      </div>
    </section>
  );
}

export default FeaturedRooms;
