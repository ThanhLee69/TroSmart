import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Col, Row, Tag, Typography } from "antd";
import {
  ArrowRightOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  KeyOutlined,
  MessageOutlined,
  SearchOutlined,
  ToolOutlined,
} from "@ant-design/icons";

import HomeBanner from "./HomeBanner";
import FeaturedRooms from "./FeaturedRooms";
import { ROOM_TYPE_LABELS } from "../../../components/PublicRoomCard";
import standardImage from "../../../assets/images/standard.jpeg";
import loftImage from "../../../assets/images/loft.jpeg";
import studioImage from "../../../assets/images/studio.jpeg";
import miniImage from "../../../assets/images/mini.jpeg";
import "./HomePage.css";

const { Title, Paragraph, Text } = Typography;

/* =====================================================================
   NỘI DUNG
   ===================================================================== */

// code trùng với enum RoomType của backend; tên hiển thị lấy từ ROOM_TYPE_LABELS
const ROOM_TYPES = [
  {
    code: "STANDARD",
    description: "Một phòng gọn gàng cho nhu cầu ở cơ bản, giá thuê dễ chịu.",
    image: standardImage,
  },
  {
    code: "LOFT",
    description: "Có gác lửng tận dụng chiều cao, thêm chỗ ngủ hoặc để đồ.",
    image: loftImage,
  },
  {
    code: "STUDIO",
    description: "Khu ở, bếp và vệ sinh gói gọn trong một căn, tiện nấu nướng.",
    image: studioImage,
  },
  {
    code: "MINI_APARTMENT",
    description: "Căn hộ nhiều phòng, riêng tư, hợp ở nhóm hoặc thuê dài hạn.",
    image: miniImage,
  },
];

const RENTAL_STEPS = [
  {
    icon: <SearchOutlined />,
    title: "Tìm phòng",
    description:
      "Lọc theo khu vực hoặc vị trí, giá, diện tích và loại phòng. Xem ảnh và tiện nghi của từng phòng.",
    from: "#6b82f2",
    to: "#4a5be0",
  },
  {
    icon: <CalendarOutlined />,
    title: "Đặt lịch xem phòng",
    description:
      "Gửi thông tin liên hệ, chủ trọ sẽ xác nhận ngày giờ để bạn đến xem phòng trực tiếp.",
    from: "#a08cf7",
    to: "#6756d9",
  },
  {
    icon: <FileTextOutlined />,
    title: "Ký hợp đồng",
    description:
      "Thống nhất giá thuê, tiền cọc và thời hạn. Hợp đồng được lưu trên hệ thống để xem lại bất cứ lúc nào.",
    from: "#3ec5a5",
    to: "#159f83",
  },
  {
    icon: <KeyOutlined />,
    title: "Nhận phòng",
    description:
      "Từ kỳ đầu tiên, hóa đơn tiền phòng, điện và nước được gửi cho bạn theo từng tháng.",
    from: "#f7b868",
    to: "#d9801c",
  },
];

const TENANT_FEATURES = [
  { icon: <FileTextOutlined />, text: "Xem hợp đồng và thời hạn thuê" },
  {
    icon: <CreditCardOutlined />,
    text: "Theo dõi hóa đơn tiền phòng, điện, nước",
  },
  { icon: <CheckCircleOutlined />, text: "Kiểm tra khoản đã trả và còn nợ" },
  { icon: <ToolOutlined />, text: "Gửi yêu cầu sửa chữa, nhận thông báo" },
];

/* =====================================================================
   CÁC PHẦN CỦA TRANG
   ===================================================================== */

/* Hiện dần khi cuộn tới (tự bỏ nếu trình duyệt không hỗ trợ) */
function Reveal({
  as: Tag = "div",
  className = "",
  delay = 0,
  style,
  children,
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`hp-reveal${shown ? " is-shown" : ""} ${className}`}
      style={{ "--delay": `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

/* Tiêu đề chung của mỗi phần */
function SectionHead({ title, subtitle }) {
  return (
    <div className="hp-head">
      <Title level={2} className="hp-title">
        {title}
      </Title>
      {subtitle && <Paragraph className="hp-subtitle">{subtitle}</Paragraph>}
    </div>
  );
}

/* 1. Khám phá theo loại phòng: bấm vào sang trang Tìm phòng với loại đó */
function RoomTypeSection() {
  const navigate = useNavigate();

  const select = (code) => navigate(`/tim-phong?types=${code}`);

  return (
    <section className="hp-section">
      <div className="hp-container">
        <SectionHead
          title="Khám phá theo loại phòng"
          subtitle="Lựa chọn không gian phù hợp với nhu cầu và phong cách sống của bạn."
        />

        <Row gutter={[20, 20]} className="room-type-list">
          {ROOM_TYPES.map((room) => {
            const name = ROOM_TYPE_LABELS[room.code] ?? room.code;

            return (
              <Col xs={12} sm={12} lg={6} key={room.code}>
                <article
                  className="room-type-card"
                  role="link"
                  tabIndex={0}
                  aria-label={`Tìm ${name}`}
                  onClick={() => select(room.code)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      select(room.code);
                    }
                  }}
                >
                  <div className="room-type-card__image-wrapper">
                    <img
                      src={room.image}
                      alt={name}
                      className="room-type-card__image"
                      loading="lazy"
                    />
                  </div>

                  <div className="room-type-card__content">
                    <Title level={4} className="room-type-card__name">
                      {name}
                    </Title>

                    <Paragraph className="room-type-card__description">
                      {room.description}
                    </Paragraph>

                    <div className="room-type-card__link">
                      <Text>Tìm phòng</Text>
                      <ArrowRightOutlined />
                    </div>
                  </div>
                </article>
              </Col>
            );
          })}
        </Row>
      </div>
    </section>
  );
}

/* 2. Quy trình thuê phòng */
function HowToRent() {
  return (
    <section className="hp-section hp-section--flush">
      <div className="hp-container">
        <SectionHead
          title="Thuê phòng qua bốn bước"
          subtitle="Từ lúc chọn phòng đến khi nhận phòng."
        />

        <ol className="hp-flow">
          {RENTAL_STEPS.map((step, index) => (
            <Reveal
              as="li"
              key={step.title}
              delay={index * 90}
              className="hp-flow__item"
              style={{ "--from": step.from, "--to": step.to }}
            >
              <span className="hp-flow__step">Bước {index + 1}</span>
              <span className="hp-flow__icon">{step.icon}</span>
              <h3 className="hp-flow__title">{step.title}</h3>
              <p className="hp-flow__desc">{step.description}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* 3. Vì sao chọn TroSmart: lưới bento, mỗi ô có một hình minh họa nhỏ */
function WhyTroSmart() {
  return (
    <section className="hp-section hp-section--flush">
      <div className="hp-container">
        <SectionHead
          title="Vì sao chọn TroSmart"
          subtitle="Tìm phòng dễ, thông tin minh bạch, thuê xong vẫn có người đồng hành."
        />

        <div className="hp-bento">
          {/* Ô lớn: trạng thái phòng */}
          <Reveal className="hp-card hp-card--feature">
            <span className="hp-card__badge">
              <CheckCircleOutlined /> Luôn đúng thực tế
            </span>
            <h3 className="hp-card__title">Chỉ hiện phòng còn trống</h3>
            <p className="hp-card__desc">
              Trạng thái lấy từ hệ thống quản lý. Phòng đã cho thuê hoặc đang
              bảo trì sẽ không hiện ra, bạn không mất công hỏi phòng còn hay
              hết.
            </p>

            <div className="hp-rooms" aria-hidden="true">
              <div className="hp-rooms__row is-on">
                <span>A101 · Tầng 1</span>
                <em className="hp-pill hp-pill--ok">Hiện trên web</em>
              </div>
              <div className="hp-rooms__row">
                <span>A102 · Tầng 1</span>
                <em className="hp-pill">Đã cho thuê</em>
              </div>
              <div className="hp-rooms__row">
                <span>B203 · Tầng 2</span>
                <em className="hp-pill">Đang bảo trì</em>
              </div>
              <span className="hp-sample">Minh họa</span>
            </div>
          </Reveal>

          {/* Tìm gần */}
          <Reveal className="hp-card hp-card--wide" delay={90}>
            <span className="hp-card__icon hp-card__icon--blue">
              <SearchOutlined />
            </span>
            <h3 className="hp-card__title hp-card__title--dark">
              Tìm phòng gần nơi bạn cần
            </h3>
            <p className="hp-card__desc hp-card__desc--dark">
              Nhập nơi làm việc hoặc trường học, TroSmart hiện các phòng quanh
              đó kèm khoảng cách, giá và diện tích.
            </p>

            <div className="hp-near" aria-hidden="true">
              <div className="hp-near__row">
                <span className="hp-near__dist">0,8 km</span>
                <span className="hp-near__name">Phòng Studio · 24 m²</span>
                <strong>3,2 triệu</strong>
              </div>
              <div className="hp-near__row">
                <span className="hp-near__dist">1,5 km</span>
                <span className="hp-near__name">Phòng có gác · 20 m²</span>
                <strong>2,6 triệu</strong>
              </div>
            </div>
          </Reveal>

          {/* Hóa đơn */}
          <Reveal className="hp-card" delay={180}>
            <span className="hp-card__icon hp-card__icon--teal">
              <FileTextOutlined />
            </span>
            <h3 className="hp-card__title hp-card__title--dark">
              Hóa đơn rõ từng khoản
            </h3>
            <p className="hp-card__desc hp-card__desc--dark">
              Tiền phòng, điện, nước theo từng kỳ, kèm trạng thái đã trả hay còn
              nợ.
            </p>

            <div className="hp-split" aria-hidden="true">
              <div className="hp-split__bar">
                <i style={{ width: "87%", background: "#4a5be0" }} />
                <i style={{ width: "10.5%", background: "#f0a23a" }} />
                <i style={{ width: "2.5%", background: "#3fb6d9" }} />
              </div>
              <ul className="hp-split__legend">
                <li>
                  <b style={{ background: "#4a5be0" }} /> Phòng
                </li>
                <li>
                  <b style={{ background: "#f0a23a" }} /> Điện
                </li>
                <li>
                  <b style={{ background: "#3fb6d9" }} /> Nước
                </li>
              </ul>
            </div>
          </Reveal>

          {/* Sửa chữa */}
          <Reveal className="hp-card" delay={270}>
            <span className="hp-card__icon hp-card__icon--amber">
              <ToolOutlined />
            </span>
            <h3 className="hp-card__title hp-card__title--dark">
              Báo sửa chữa trực tuyến
            </h3>
            <p className="hp-card__desc hp-card__desc--dark">
              Gửi yêu cầu khi phòng có sự cố và theo dõi tiến độ xử lý ngay trên
              hệ thống.
            </p>

            <ol className="hp-progress" aria-hidden="true">
              <li className="is-done">
                <b />
                <span>Đã gửi</span>
              </li>
              <li className="is-now">
                <b />
                <span>Đang xử lý</span>
              </li>
              <li>
                <b />
                <span>Hoàn thành</span>
              </li>
            </ol>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* 4. Dành cho người đang thuê: giới thiệu cổng người thuê */
function TenantPortal() {
  const navigate = useNavigate();

  return (
    <section className="hp-section hp-section--flush">
      <div className="hp-container">
        <Reveal className="hp-tenant">
          <div className="hp-tenant__info">
            <span className="hp-kicker">Dành cho người đang thuê</span>

            <Title level={2} className="hp-tenant__title">
              Hợp đồng, hóa đơn và sửa chữa trong một tài khoản
            </Title>

            <Paragraph className="hp-tenant__desc">
              Theo dõi thông tin thuê phòng, chi phí từng tháng và thông báo từ
              chủ trọ ngay trên TroSmart.
            </Paragraph>

            <ul className="hp-tfeat">
              {TENANT_FEATURES.map((item) => (
                <li key={item.text}>
                  <span className="hp-tfeat__icon">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>

            <Button
              type="primary"
              size="large"
              className="hp-btn-primary"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => navigate("/dang-nhap")}
            >
              Đăng nhập người thuê
            </Button>
          </div>

          {/* Hóa đơn minh họa, kèm vài thẻ nổi cho sinh động */}
          <div className="hp-stage" aria-hidden="true">
            <div className="hp-float hp-float--chip">
              <CheckCircleFilled /> Hợp đồng đang hiệu lực
            </div>

            <div className="hp-invoice">
              <div className="hp-invoice__head">
                <div>
                  <span className="hp-invoice__label">Hóa đơn tiền phòng</span>
                  <strong className="hp-invoice__month">Tháng 10/2026</strong>
                  <span className="hp-invoice__room">Phòng A301 · Tòa A</span>
                </div>
                <span className="hp-invoice__icon">
                  <FileTextOutlined />
                </span>
              </div>

              <div className="hp-invoice__status">
                <Tag color="warning">Chờ thanh toán</Tag>
                <span className="hp-invoice__sample">Hóa đơn minh họa</span>
              </div>

              <dl className="hp-invoice__rows">
                <div>
                  <dt>Tiền phòng</dt>
                  <dd>2.800.000đ</dd>
                </div>
                <div>
                  <dt>Điện (96 kWh)</dt>
                  <dd>336.000đ</dd>
                </div>
                <div>
                  <dt>Nước (4 m³)</dt>
                  <dd>80.000đ</dd>
                </div>
              </dl>

              <div className="hp-invoice__total">
                <span>Tổng cộng</span>
                <strong>3.216.000đ</strong>
              </div>
            </div>

            <div className="hp-float hp-float--toast">
              <span className="hp-float__icon">
                <BellOutlined />
              </span>
              <div>
                <b>Thông báo từ chủ trọ</b>
                <span>Đã nhận thanh toán tháng 9</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* 4. Lời kêu gọi cuối trang */
function ContactCta() {
  const navigate = useNavigate();

  return (
    <section className="hp-section hp-section--last">
      <div className="hp-container">
        <Reveal className="hp-cta">
          <div className="hp-cta__text">
            <Title level={2} className="hp-cta__title">
              Chưa tìm được phòng ưng ý?
            </Title>
            <Paragraph className="hp-cta__desc">
              Cho chúng tôi biết khu vực, mức giá và thời gian bạn muốn dọn vào.
              TroSmart sẽ giúp bạn tìm những phòng còn trống phù hợp.
            </Paragraph>
          </div>

          <div className="hp-cta__actions">
            <Button
              size="large"
              className="hp-cta__btn hp-cta__btn--light"
              onClick={() => navigate("/tim-phong")}
            >
              Tìm phòng ngay
            </Button>
            <Button
              size="large"
              className="hp-cta__btn hp-cta__btn--outline"
              icon={<MessageOutlined />}
              onClick={() => navigate("/lien-he")}
            >
              Liên hệ tư vấn
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =====================================================================
   TRANG CHỦ
   Thứ tự: tìm phòng, xem theo loại, phòng trống, quy trình thuê,
   lý do chọn, cổng người thuê, liên hệ.
   ===================================================================== */

function HomePage() {
  return (
    <div className="home-page">
      <HomeBanner />
      <RoomTypeSection />
      <FeaturedRooms />
      <HowToRent />
      <WhyTroSmart />
      <TenantPortal />
      <ContactCta />
    </div>
  );
}

export default HomePage;
