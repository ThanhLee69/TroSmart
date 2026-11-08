import React from "react";
import { Link } from "react-router-dom";
import { Tooltip } from "antd";
import {
  FacebookFilled,
  InstagramOutlined,
  YoutubeFilled,
  TikTokOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { SiZalo } from "react-icons/si";
import "./PublicFooter.css";
import logo from "../../../assets/images/trosmart-logo.svg";

const exploreLinks = [
  { label: "Trang chủ", to: "/" },
  { label: "Tìm phòng trọ", to: "/tim-phong" },
  { label: "Giới thiệu TroSmart", to: "/gioi-thieu" },
  { label: "Liên hệ", to: "/lien-he" },
];

const informationLinks = [
  {
    label: "Điều khoản sử dụng",
    href: "https://tromoi.com/thong-tin/dieu-khoan-su-dung",
  },
  {
    label: "Điều khoản & Cam kết",
    href: "https://tromoi.com/thong-tin/dieu-khoan-cam-ket",
  },
  {
    label: "Quy chế hoạt động",
    href: "https://tromoi.com/thong-tin/quy-che-hoat-dong",
  },
  {
    label: "Chính sách bảo mật",
    href: "https://tromoi.com/thong-tin/chinh-sach-bao-mat",
  },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/",
    icon: <FacebookFilled />,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/",
    icon: <InstagramOutlined />,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/",
    icon: <YoutubeFilled />,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/",
    icon: <TikTokOutlined />,
  },
];

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__container">
        <div className="public-footer__grid">
          {/* Cột 1: Logo, giới thiệu, mạng xã hội */}
          <div className="public-footer__brand">
            <img
              src={logo}
              alt="TroSmart"
              className="public-footer__logo-img"
            />

            <p className="public-footer__text">
              TroSmart giúp bạn tìm kiếm phòng trọ phù hợp và hỗ trợ quản lý
              thông tin thuê trọ thuận tiện, minh bạch.
            </p>

            <div>
              <span className="public-footer__label">Kết nối với TroSmart</span>

              <div className="public-footer__socials">
                {socialLinks.map((item) => (
                  <Tooltip key={item.label} title={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="public-footer__social"
                      aria-label={item.label}
                    >
                      {item.icon}
                    </a>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>

          {/* Cột 2: Khám phá */}
          <nav
            className="public-footer__col public-footer__col--explore"
            aria-label="Khám phá"
          >
            <h4 className="public-footer__heading">Khám phá</h4>
            <div className="public-footer__list">
              {exploreLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="public-footer__link"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Cột 3: Thông tin */}
          <nav
            className="public-footer__col public-footer__col--info"
            aria-label="Thông tin"
          >
            <h4 className="public-footer__heading">Thông tin</h4>
            <div className="public-footer__list">
              {informationLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="public-footer__link"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          {/* Cột 4: Liên hệ */}
          <div className="public-footer__col public-footer__col--contact">
            <h4 className="public-footer__heading">Liên hệ</h4>
            <div className="public-footer__list">
              <a href="tel:0369958572" className="public-footer__link">
                <PhoneOutlined className="public-footer__contact-icon" />
                <span>0369 958 572</span>
              </a>

              <a
                href="https://zalo.me/0369958572"
                target="_blank"
                rel="noopener noreferrer"
                className="public-footer__link"
              >
                <SiZalo className="public-footer__contact-icon" />
                <span>Zalo: 0369 958 572</span>
              </a>

              <a
                href="mailto:thanhld69@gmail.com"
                className="public-footer__link"
              >
                <MailOutlined className="public-footer__contact-icon" />
                <span>thanhld69@gmail.com</span>
              </a>

              <span className="public-footer__link">
                <EnvironmentOutlined className="public-footer__contact-icon" />
                <span>Trường Đại học Giao thông Vận tải</span>
              </span>
            </div>
          </div>
        </div>

        <div className="public-footer__bottom">
          <span>© 2026 TroSmart. Đồ án tốt nghiệp.</span>
          <span className="public-footer__slogan">
            Dữ liệu hiển thị là dữ liệu minh họa.
          </span>
        </div>
      </div>

      {/* Chữ TROSMART mờ trang trí ở đáy */}
      <div className="public-footer__mark" aria-hidden="true">
        TROSMART
      </div>
    </footer>
  );
}

export default PublicFooter;
