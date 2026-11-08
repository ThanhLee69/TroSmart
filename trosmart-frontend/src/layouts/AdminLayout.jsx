import React, { useEffect, useState } from "react";
import { Layout, Grid } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./components/admin/Sidebar";
import HeaderBar from "./components/admin/HeaderBar";
import FooterBar from "./components/admin/FooterBar";
import { useAuth } from "../context/AuthContext";
import { path_name } from "../constants/path_name";

const { Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const tablet = screens.md && !screens.lg;

  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // iPad dọc: thu gọn sidebar cho đủ chỗ; màn rộng: mở lại
  useEffect(() => {
    if (!mobile) setCollapsed(tablet);
  }, [mobile, tablet]);

  // Đổi trang thì đóng menu trượt trên điện thoại
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    navigate(path_name.login, { replace: true });
  };

  const sideWidth = collapsed ? 80 : 230;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar
        collapsed={collapsed}
        mobile={mobile}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        role={role}
        user={user}
        onLogout={handleLogout}
      />

      <Layout
        style={{
          marginLeft: mobile ? 0 : sideWidth,
          width: mobile ? "100%" : `calc(100% - ${sideWidth}px)`,
          minWidth: 0,
          minHeight: "100vh",
          transition: "margin-left 0.3s, width 0.3s",
        }}
      >
        <HeaderBar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          user={user}
          role={role}
          mobile={mobile}
          onOpenMenu={() => setMobileOpen(true)}
        />

        <Content
          style={{
            padding: mobile ? 12 : 15,
            minWidth: 0,
            overflowX: "hidden",
            background: "#f5f7fb",
            flex: "1 0 auto",
          }}
        >
          <Outlet />
        </Content>

        <FooterBar mobile={mobile} />
      </Layout>
    </Layout>
  );
};

export default MainLayout;
