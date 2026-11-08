import { useState } from "react";
import { Button } from "antd";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  HeartOutlined,
  HomeOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  TagOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import "./About.css";
import avt from "../../../assets/images/avt.jpg";
import image1 from "../../../assets/images/anh1.avif";
import image2 from "../../../assets/images/anh2.avif";
import image4 from "../../../assets/images/anh4.avif";
import image5 from "../../../assets/images/anh5.avif";

/* ---------- Dữ liệu cố định của trang (sửa nội dung ở đây) ---------- */

// Đường dẫn các trang – đổi cho khớp với file router của bạn
const ROUTES = {
  rooms: "/tim-phong",
  contact: "/lien-he",
  login: "/dang-nhap",
};

// Thông tin chủ trọ (cùng số Zalo với trang Liên hệ)
const HOST = {
  name: "Lê Đăng Thành",
  role: "Chủ trọ TroSmart",
  zalo: "https://zalo.me/0369958572",
};

// tone: blue | purple | green | orange (màu định nghĩa trong About.css)
const HERO_PERKS = [
  "Không phí môi giới",
  "Không cần tạo tài khoản",
  "Phòng còn trống thật",
];

const STRENGTHS = [
  {
    icon: <SafetyCertificateOutlined />,
    tone: "green",
    title: "An ninh và an toàn",
    text: "Camera giám sát, cổng khóa riêng và thiết bị phòng cháy chữa cháy được trang bị đầy đủ.",
  },
  {
    icon: <TagOutlined />,
    tone: "orange",
    title: "Giá thuê minh bạch",
    text: "Giá phòng, điện, nước và phí dịch vụ được niêm yết rõ ràng, không phát sinh chi phí ẩn.",
  },
  {
    icon: <HomeOutlined />,
    tone: "blue",
    title: "Phòng sạch, tiện nghi",
    text: "Phòng được vệ sinh kỹ trước khi bàn giao, có sẵn tiện nghi cơ bản để dọn vào ở ngay.",
  },
  {
    icon: <EnvironmentOutlined />,
    tone: "purple",
    title: "Vị trí thuận tiện",
    text: "Gần trường học, chợ, siêu thị và bến xe buýt, đi lại dễ dàng mỗi ngày.",
  },
  {
    icon: <ToolOutlined />,
    tone: "orange",
    title: "Hỗ trợ sửa chữa nhanh",
    text: "Báo sự cố điện, nước, thiết bị trực tiếp trên hệ thống và theo dõi tiến độ xử lý.",
  },
  {
    icon: <FileTextOutlined />,
    tone: "green",
    title: "Hợp đồng và hóa đơn rõ ràng",
    text: "Hợp đồng lưu trên hệ thống, hóa đơn điện nước gửi đúng kỳ, theo dõi thanh toán dễ dàng.",
  },
];

// Ba nhóm người dùng của hệ thống
const ROLES = [
  {
    icon: <SearchOutlined />,
    tone: "blue",
    who: "Người tìm phòng",
    short: "Không cần tài khoản",
    title: "Tìm và đi xem phòng trong vài phút",
    points: [
      "Lọc phòng theo khu vực, giá, diện tích, loại phòng",
      "Xem ảnh, tiện nghi và khoảng cách đến nơi bạn cần",
      "Gửi lịch xem phòng cho chủ trọ",
    ],
    cta: "Tìm phòng",
    to: ROUTES.rooms,
  },
  {
    icon: <KeyOutlined />,
    tone: "green",
    who: "Người đang thuê",
    short: "Có tài khoản riêng",
    title: "Mọi việc thuê phòng trong một tài khoản",
    points: [
      "Xem hợp đồng và thời hạn thuê",
      "Xem hóa đơn, khoản đã trả và còn nợ",
      "Gửi yêu cầu sửa chữa và theo dõi tiến độ",
    ],
    cta: "Đăng nhập người thuê",
    to: ROUTES.login,
  },
  {
    icon: <SettingOutlined />,
    tone: "purple",
    who: "Chủ trọ",
    short: "Quản lý tập trung",
    title: "Quản lý cả nhà trọ ở một nơi",
    points: [
      "Quản lý tòa nhà, phòng và hợp đồng",
      "Lập hóa đơn, xác nhận thanh toán",
      "Tiếp nhận yêu cầu xem phòng và sửa chữa",
    ],
    cta: "Đăng nhập quản lý",
    to: ROUTES.login,
  },
];

const RULES = [
  {
    icon: <ClockCircleOutlined />,
    tone: "blue",
    title: "Giờ giấc",
    text: "Ra vào tự do cả ngày. Giữ yên tĩnh trong khoảng [22:00 – 06:00] để mọi người nghỉ ngơi.",
  },
  {
    icon: <TeamOutlined />,
    tone: "orange",
    title: "Khách đến chơi",
    text: "Khách vui lòng báo trước với chủ trọ. Không cho người ngoài ở lại qua đêm khi chưa đăng ký.",
  },
  {
    icon: <HeartOutlined />,
    tone: "purple",
    title: "Thú cưng",
    text: "Được nuôi khi có sự đồng ý của chủ trọ. Người nuôi chịu trách nhiệm vệ sinh và tiếng ồn.",
  },
  {
    icon: <DollarOutlined />,
    tone: "green",
    title: "Đặt cọc",
    text: "Đặt cọc [1] tháng tiền phòng khi ký hợp đồng, hoàn lại đầy đủ khi trả phòng đúng hạn.",
  },
];

// Ảnh mặc định cho trang giới thiệu TroSmart
const DEFAULT_IMAGES = {
  // Ảnh phòng trọ nổi bật
  heroMain: image1,

  // Ảnh phòng ngủ
  heroTop: image2,

  // Ảnh tòa nhà
  heroBottom: image4,

  // Ảnh không gian sống cho phần câu chuyện
  story: image5,

  // Ảnh người quản lý / chủ trọ
  host: avt,
};

/* ---------- Component nhỏ dùng lại ---------- */

// Hiện ảnh thật nếu có src, chưa có thì hiện khung giữ chỗ
function Photo({ src, alt, label, className = "" }) {
  if (src) {
    return (
      <img
        className={`about-photo ${className}`}
        src={src}
        alt={alt}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={`about-photo about-photo--placeholder ${className}`}
      role="img"
      aria-label={alt}
    >
      {label}
    </div>
  );
}

// Tiêu đề phần: vạch xanh phía trước, giống trang chủ
function SectionHead({ title, subtitle }) {
  return (
    <header className="about-head">
      <h2 className="about-heading">{title}</h2>
      {subtitle && <p className="about-subtitle">{subtitle}</p>}
    </header>
  );
}

/* ---------- Trang giới thiệu ----------
 * images (không bắt buộc): { heroMain, heroTop, heroBottom, story, host }
 * Truyền đường dẫn ảnh thật vào, không truyền thì dùng ảnh mặc định.
 */
export default function About({ images = {} }) {
  const [activeRole, setActiveRole] = useState(0);
  const role = ROLES[activeRole];

  const pageImages = {
    ...DEFAULT_IMAGES,
    ...images,
  };

  return (
    <div className="about">
      {/* HERO: chữ bên trái, cụm ba ảnh so le bên phải */}
      <section className="about-hero">
        <div className="about-hero__inner">
          <div className="about-hero__content">
            <span className="about-kicker">Về TroSmart</span>

            <h1 className="about-hero__title">
              Tìm phòng trọ ưng ý, <span>nhanh hơn bạn nghĩ.</span>
            </h1>

            <p className="about-hero__lead">
              Xem các phòng còn trống của hệ thống nhà trọ TroSmart, gần nơi bạn
              học và làm việc. Giá rõ ràng, ảnh thật, thông tin luôn được cập
              nhật.
            </p>

            <div className="about-actions">
              <Link to={ROUTES.rooms}>
                <Button
                  type="primary"
                  size="large"
                  className="about-btn about-btn--primary"
                >
                  Tìm phòng ngay
                </Button>
              </Link>
              <Link to={ROUTES.contact}>
                <Button size="large" className="about-btn about-btn--outline">
                  Nói chuyện với chúng tôi
                </Button>
              </Link>
            </div>

            <ul className="about-perks">
              {HERO_PERKS.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
          </div>

          <div className="about-hero__grid">
            <Photo
              className="about-hero__main"
              src={pageImages.heroMain}
              alt="Phòng trọ nổi bật"
              label="[Ảnh phòng trọ nổi bật]"
            />
            <Photo
              className="about-hero__top"
              src={pageImages.heroTop}
              alt="Phòng trọ"
              label="[Ảnh phòng]"
            />
            <Photo
              className="about-hero__bottom"
              src={pageImages.heroBottom}
              alt="Tòa nhà"
              label="[Ảnh tòa nhà]"
            />
          </div>
        </div>
      </section>

      <div className="about-container">
        {/* CÂU CHUYỆN */}
        <section className="about-section about-story">
          <Photo
            className="about-story__photo"
            src={pageImages.story}
            alt="Khu trọ TroSmart"
            label="[Ảnh đội ngũ / khu trọ]"
          />

          <div>
            <span className="about-kicker">Câu chuyện của chúng tôi</span>
            <h2 className="about-title">
              Bắt đầu từ chính nỗi lo khi đi thuê trọ.
            </h2>
            <p className="about-text">
              Ai từng thuê trọ đều biết cảm giác: tin đăng cũ, ảnh không giống
              thật, đến nơi mới biết phòng đã có người thuê. Vì vậy chúng tôi
              xây dựng website này để bạn xem phòng của TroSmart một cách đơn
              giản và đáng tin cậy.
            </p>
            <p className="about-text">
              Tất cả phòng đều do chính chủ trọ quản lý. Phòng nào còn trống mới
              được hiển thị, giá và chi phí được nêu rõ, nên bạn chỉ cần chọn và
              đi xem.
            </p>
            <Link to={ROUTES.rooms} className="about-link">
              Khám phá phòng trống <ArrowRightOutlined />
            </Link>
          </div>
        </section>

        {/* THẾ MẠNH */}
        <section className="about-section">
          <SectionHead
            title="Vì sao chọn TroSmart"
            subtitle="Những điều giúp bạn ở yên tâm, từ lúc xem phòng đến khi trả phòng."
          />

          <div className="about-strengths">
            {STRENGTHS.map((item, index) => {
              const wide = [0, 3, 5].includes(index);
              const solid = [0, 3].includes(index);

              return (
                <article
                  key={item.title}
                  className={`about-card about-str tone-${item.tone}${
                    wide ? " about-str--wide" : ""
                  }${solid ? " about-str--solid" : ""}`}
                >
                  <span className="about-str__no" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span className="about-icon">{item.icon}</span>
                  <h3 className="about-card__title">{item.title}</h3>
                  <p className="about-card__text">{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* BA NHÓM NGƯỜI DÙNG: chọn một nhóm để xem phần việc của nhóm đó */}
        <section className="about-section">
          <SectionHead
            title="TroSmart dành cho ai"
            subtitle="Chọn vai trò của bạn để xem hệ thống giúp được gì."
          />

          <div className={`about-who tone-${role.tone}`}>
            <div className="about-who__tabs" role="tablist">
              {ROLES.map((item, index) => (
                <button
                  key={item.who}
                  type="button"
                  role="tab"
                  aria-selected={index === activeRole}
                  className={`about-who__tab${
                    index === activeRole ? " is-active" : ""
                  }`}
                  onClick={() => setActiveRole(index)}
                >
                  <span className="about-who__tab-icon">{item.icon}</span>
                  <span className="about-who__tab-text">
                    <b>{item.who}</b>
                    <small>{item.short}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="about-who__panel" key={role.who} role="tabpanel">
              <span className="about-who__no" aria-hidden="true">
                0{activeRole + 1}
              </span>

              <h3 className="about-who__title">{role.title}</h3>

              <ul className="about-who__list">
                {role.points.map((point) => (
                  <li key={point}>
                    <CheckCircleFilled />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <Link to={role.to} className="about-who__cta">
                {role.cta} <ArrowRightOutlined />
              </Link>
            </div>
          </div>
        </section>

        {/* NỘI QUY */}
        <section className="about-section about-rules">
          <div className="about-rules__intro">
            <span className="about-kicker">Nội quy và quy định thuê</span>
            <h2 className="about-title">
              Rõ ràng ngay từ đầu, ở yên tâm về sau
            </h2>
            <p className="about-text">
              Những điều người thuê hay hỏi nhất được ghi sẵn ở đây. Nội quy đầy
              đủ sẽ có trong hợp đồng thuê phòng.
            </p>
            <Link to={ROUTES.contact} className="about-link">
              Cần hỏi thêm? Liên hệ chủ trọ <ArrowRightOutlined />
            </Link>
          </div>

          <div className="about-rules__list">
            {RULES.map((item) => (
              <article
                key={item.title}
                className={`about-card about-card--rule tone-${item.tone}`}
              >
                <div className="about-rule__head">
                  <span className="about-icon about-icon--sm">{item.icon}</span>
                  <h3 className="about-card__title">{item.title}</h3>
                </div>
                <p className="about-card__text">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* GẶP CHỦ TRỌ: thẻ sáng, ảnh bên trái, lời cam kết bên phải */}
        <section className="about-section about-host">
          <Photo
            className="about-host__photo"
            src={pageImages.host}
            alt="Chủ trọ"
            label="[Ảnh chủ trọ]"
          />

          <div className="about-host__body">
            <span className="about-kicker">Gặp chủ trọ</span>

            <blockquote className="about-host__quote">
              Phòng nào hiện trên web là phòng còn trống thật. Giá nào ghi trên
              web là giá bạn trả.
            </blockquote>

            <p className="about-host__text">
              Tôi trực tiếp quản lý từng tòa nhà nên mọi yêu cầu xem phòng, sửa
              chữa hay thắc mắc về hóa đơn đều được trả lời nhanh, không qua
              trung gian.
            </p>

            <div className="about-host__sign">
              <strong>{HOST.name}</strong>
              <span>{HOST.role}</span>
            </div>

            <div className="about-actions">
              <Button
                size="large"
                className="about-btn about-btn--primary"
                href={HOST.zalo}
                target="_blank"
                rel="noopener noreferrer"
              >
                Nhắn Zalo cho chủ trọ
              </Button>
              <Link to={ROUTES.rooms}>
                <Button size="large" className="about-btn about-btn--outline">
                  Xem phòng trống
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
