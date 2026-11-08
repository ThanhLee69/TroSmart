import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Drawer } from "antd";
import {
  MenuOutlined,
  CloseOutlined,
  LoginOutlined,
  RightOutlined,
} from "@ant-design/icons";
import logo from "../../../assets/images/trosmart-logo.svg";
import "./PublicHeader.css";

const menuItems = [
  { key: "/", label: "Trang chủ" },
  { key: "/tim-phong", label: "Tìm phòng" },
  { key: "/gioi-thieu", label: "Giới thiệu" },
  { key: "/lien-he", label: "Liên hệ" },
];

// Xác định menu đang được chọn.
function getActiveKey(pathname) {
  if (pathname === "/") return "/";
  if (pathname === "/tim-phong" || pathname.startsWith("/tim-phong/")) {
    return "/tim-phong";
  }
  if (pathname === "/gioi-thieu") return "/gioi-thieu";
  if (pathname === "/lien-he") return "/lien-he";
  return "";
}

const PublicHeader = () => {
  const location = useLocation();
  const [openMenu, setOpenMenu] = React.useState(false);

  const activeKey = React.useMemo(
    () => getActiveKey(location.pathname),
    [location.pathname],
  );

  const closeMenu = () => setOpenMenu(false);

  // Đóng menu mobile khi chuyển trang.
  React.useEffect(() => {
    setOpenMenu(false);
  }, [location.pathname]);

  // Đóng menu mobile khi màn hình được mở rộng lên tablet hoặc desktop.
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handleChange = (event) => {
      if (event.matches) setOpenMenu(false);
    };

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  return (
    <>
      <header className="public-header">
        <div className="public-header__inner">
          {/* Logo */}
          <Link
            to="/"
            className="public-header__logo"
            aria-label="TroSmart - Trang chủ"
          >
            <img src={logo} alt="TroSmart" />
          </Link>

          {/* Menu desktop và tablet */}
          <nav className="public-header__nav" aria-label="Điều hướng chính">
            {menuItems.map((item) => {
              const active = activeKey === item.key;

              return (
                <Link
                  key={item.key}
                  to={item.key}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "public-header__link public-header__link--active"
                      : "public-header__link"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Đăng nhập (desktop) và nút mở menu (mobile) */}
          <div className="public-header__actions">
            <Link to="/dang-nhap" className="public-header__login">
              Đăng nhập
            </Link>

            <button
              type="button"
              className="public-header__burger"
              aria-label="Mở menu"
              aria-expanded={openMenu}
              onClick={() => setOpenMenu(true)}
            >
              <MenuOutlined />
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile */}
      <Drawer
        placement="right"
        width={300}
        open={openMenu}
        onClose={closeMenu}
        closable={false}
        rootClassName="public-drawer"
        title={
          <Link
            to="/"
            onClick={closeMenu}
            className="public-drawer__brand"
            aria-label="TroSmart - Trang chủ"
          >
            <img src={logo} alt="TroSmart" />
          </Link>
        }
        extra={
          <button
            type="button"
            className="public-drawer__close"
            aria-label="Đóng menu"
            onClick={closeMenu}
          >
            <CloseOutlined />
          </button>
        }
        footer={
          <Link
            to="/dang-nhap"
            onClick={closeMenu}
            className="public-drawer__login"
          >
            <LoginOutlined />
            Đăng nhập
          </Link>
        }
      >
        <nav aria-label="Điều hướng mobile" className="public-drawer__nav">
          {menuItems.map((item) => {
            const active = activeKey === item.key;

            return (
              <Link
                key={item.key}
                to={item.key}
                onClick={closeMenu}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "public-drawer__link public-drawer__link--active"
                    : "public-drawer__link"
                }
              >
                <span>{item.label}</span>
                <RightOutlined className="public-drawer__arrow" />
              </Link>
            );
          })}
        </nav>
      </Drawer>
    </>
  );
};

export default PublicHeader;
