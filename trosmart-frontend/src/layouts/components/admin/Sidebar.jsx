import React, { useEffect, useMemo, useState } from "react";
import { Menu, Layout, Drawer, Avatar, Tooltip } from "antd";
import {
  HomeOutlined,
  AppstoreAddOutlined,
  TeamOutlined,
  SnippetsOutlined,
  FileTextOutlined,
  WarningOutlined,
  SoundOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  CarOutlined,
  ToolOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  UsergroupAddOutlined,
  DiscordOutlined,
  LogoutOutlined,
  UserOutlined,
  ProfileOutlined,
  UnorderedListOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { path_name } from "../../../constants/path_name";
import {
  ROLES,
  ROLE_LABELS,
  tenant_path_name,
  canAccess,
} from "../../../context/PermissionContext";
import logo from "../../../assets/images/trosmart-logo.svg";
import logoIcon from "../../../assets/images/trosmart-icon.svg";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";

const { Sider } = Layout;

/* Đủ menu của quản trị viên. Mục nào khách thuê không được vào sẽ tự bị ẩn (xem filterMenu). */
const ALL_MENU_ITEMS = [
  { key: path_name.dashboard, icon: <HomeOutlined />, label: "Tổng quan" },
  {
    key: "rental-management",
    icon: <UnorderedListOutlined />,
    label: "Nhà trọ",
    children: [
      {
        key: path_name.building,
        icon: <HiOutlineBuildingOffice2 />,
        label: "Tòa nhà",
      },
      { key: path_name.room, icon: <AppstoreAddOutlined />, label: "Phòng" },
    ],
  },
  {
    key: "tenant-management",
    icon: <UsergroupAddOutlined />,
    label: "Người thuê",
    children: [
      { key: path_name.tenant, icon: <TeamOutlined />, label: "Khách thuê" },
      { key: path_name.tenantVehicle, icon: <CarOutlined />, label: "Xe" },
    ],
  },
  { key: path_name.contract, icon: <SnippetsOutlined />, label: "Hợp đồng" },
  { key: path_name.meter, icon: <ThunderboltOutlined />, label: "Điện nước" },
  { key: path_name.invoice, icon: <FileTextOutlined />, label: "Hóa đơn" },
  {
    key: path_name.issue,
    icon: <ToolOutlined />,
    label: "Sửa chữa",
  },
  { key: path_name.notification, icon: <SoundOutlined />, label: "Thông báo" },
  {
    key: path_name.contactManage,
    icon: <MessageOutlined />,
    label: "Liên hệ",
  },
  {
    key: "settings",
    icon: <SettingOutlined />,
    label: "Cài đặt",
    children: [
      { key: path_name.amenity, icon: <ToolOutlined />, label: "Tiện ích" },
      { key: path_name.service, icon: <DiscordOutlined />, label: "Dịch vụ" },
      {
        key: path_name.user,
        icon: <SafetyCertificateOutlined />,
        label: "Tài khoản",
      },
    ],
  },
];

/* Menu của khách thuê: chỉ xem và làm việc liên quan đến phòng của mình */
const TENANT_MENU_ITEMS = [
  { key: tenant_path_name.home, icon: <HomeOutlined />, label: "Tổng quan" },
  {
    key: tenant_path_name.contract,
    icon: <HiOutlineBuildingOffice2 />,
    label: "Phòng",
  },
  {
    key: tenant_path_name.invoice,
    icon: <FileTextOutlined />,
    label: "Hóa đơn",
  },
  {
    key: tenant_path_name.issue,
    icon: <ToolOutlined />,
    label: "Sửa chữa",
  },
  {
    key: tenant_path_name.notification,
    icon: <SoundOutlined />,
    label: "Thông báo",
  },
  {
    key: tenant_path_name.profile,
    icon: <UserOutlined />,
    label: "Tài khoản",
  },
];

/* Giữ lại mục mà vai trò này được vào; nhóm không còn mục con thì bỏ luôn */
const filterMenu = (items, role) =>
  items
    .map((item) => {
      if (!item.children) return canAccess(role, item.key) ? item : null;
      const children = filterMenu(item.children, role);
      return children.length ? { ...item, children } : null;
    })
    .filter(Boolean);

const leafKeys = (items) =>
  items.flatMap((item) =>
    item.children ? leafKeys(item.children) : [item.key],
  );

/* Kiểu nút đăng xuất: nền đỏ nhạt, rê chuột đậm lên */
const LOGOUT_CSS = `
.sidebar-logout {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: #fff1f0;
  color: #cf1322;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
}
.sidebar-logout .anticon {
  font-size: 16px;
}
.sidebar-logout:hover {
  background: #ff4d4f;
  color: #fff;
  box-shadow: 0 8px 16px -10px rgba(255, 77, 79, 0.8);
}
/* Máy tính: giống một mục menu (cao 40px, cách mép 4px, bo 4 góc 8px) */
.sidebar-logout--bar {
  width: calc(100% - 8px);
  height: 40px;
  margin: 4px 4px 0;
  padding: 0 24px;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  font-weight: 400;
}
.sidebar-logout--bar .anticon {
  font-size: 14px;
}
.sidebar-logout--bar:hover {
  background: #fff1f0;
  color: #cf1322;
  box-shadow: none;
}
.sidebar-logout--bar.is-icon-only {
  padding: 0;
}
.sidebar-logout:focus-visible {
  outline: 2px solid #ff7875;
  outline-offset: 2px;
}
`;

const Sidebar = ({
  collapsed,
  mobile,
  mobileOpen,
  onClose,
  role,
  user,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = useMemo(
    () =>
      role === ROLES.TENANT
        ? TENANT_MENU_ITEMS
        : filterMenu(ALL_MENU_ITEMS, role),
    [role],
  );

  // Mục đang chọn: đường dẫn dài nhất khớp đầu, để trang chi tiết (.../:id) vẫn sáng đúng mục
  const selectedKey = useMemo(() => {
    const path = location.pathname;
    return (
      leafKeys(menuItems)
        .filter((key) => path === key || path.startsWith(`${key}/`))
        .sort((a, b) => b.length - a.length)[0] || path
    );
  }, [location.pathname, menuItems]);

  // Mở sẵn nhóm chứa mục đang chọn
  const parentKey = useMemo(
    () =>
      menuItems.find((item) =>
        item.children?.some((c) => c.key === selectedKey),
      )?.key,
    [menuItems, selectedKey],
  );
  const [openKeys, setOpenKeys] = useState(parentKey ? [parentKey] : []);

  useEffect(() => {
    if (parentKey) setOpenKeys((prev) => [...new Set([...prev, parentKey])]);
  }, [parentKey]);

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (mobile) onClose();
  };

  const iconOnly = collapsed && !mobile;

  const menu = (
    <Menu
      mode="inline"
      items={menuItems}
      selectedKeys={[selectedKey]}
      openKeys={iconOnly ? undefined : openKeys}
      onOpenChange={setOpenKeys}
      onClick={handleMenuClick}
      style={{ borderRight: "none" }}
    />
  );

  const logoHeader = (
    <div
      style={{
        height: 64,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <img
        src={iconOnly ? logoIcon : logo}
        alt="TROSMART"
        style={{
          display: "block",
          height: iconOnly ? 32 : 44,
          maxWidth: "90%",
          width: "auto",
        }}
      />
    </div>
  );

  /* Cuối sidebar: thông tin người dùng (điện thoại) và nút đăng xuất */
  const footer = (
    <div
      style={{
        flexShrink: 0,
        // Máy tính: thanh phẳng sát đáy, cao bằng footer. Điện thoại: có đệm hai bên.
        padding: mobile ? 12 : 0,
        paddingBottom: mobile
          ? "calc(12px + env(safe-area-inset-bottom, 0px))"
          : 0,
        border: 0,
        boxShadow: "none",
        background: "#fff",
      }}
    >
      {mobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
            padding: "4px 4px 8px",
          }}
        >
          <Avatar
            size={38}
            style={{ backgroundColor: "#4d74ea", flexShrink: 0 }}
            icon={<UserOutlined />}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.fullName || user?.username || "Người dùng"}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>
              {ROLE_LABELS[role] || ""}
            </div>
          </div>
        </div>
      )}

      <Tooltip title={iconOnly ? "Đăng xuất" : ""} placement="right">
        <button
          type="button"
          className={
            mobile
              ? "sidebar-logout"
              : `sidebar-logout sidebar-logout--bar${iconOnly ? " is-icon-only" : ""}`
          }
          onClick={onLogout}
          aria-label="Đăng xuất"
          style={{ justifyContent: iconOnly ? "center" : "flex-start" }}
        >
          <LogoutOutlined />
          {!iconOnly && <span>Đăng xuất</span>}
        </button>
      </Tooltip>
    </div>
  );

  const content = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <style>{LOGOUT_CSS}</style>
      {logoHeader}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>{menu}</div>
      {footer}
    </div>
  );

  if (mobile) {
    return (
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={onClose}
        width={270}
        styles={{
          body: { padding: 0, overflow: "hidden" },
          header: { display: "none" },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={230}
      collapsedWidth={80}
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        overflow: "hidden",
        background: "#fff",
        borderRight: "1px solid #e5e5e5",
        zIndex: 100,
      }}
    >
      {content}
    </Sider>
  );
};

export default Sidebar;
