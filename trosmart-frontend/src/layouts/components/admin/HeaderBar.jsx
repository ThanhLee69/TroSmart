import React from "react";
import { Layout, Button, Avatar } from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { ROLE_LABELS } from "../../../context/PermissionContext";
import NotificationBell from "./NotificationBell";

const { Header } = Layout;

const HeaderBar = ({
  collapsed,
  setCollapsed,
  user,
  role,
  mobile,
  onOpenMenu,
}) => {
  const displayName = user?.fullName || user?.username || "Người dùng";

  return (
    <Header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 90,
        height: mobile ? 56 : 64,
        lineHeight: mobile ? "56px" : "64px",
        padding: mobile ? "0 12px" : "0 24px",
        background: "#fff",
        borderBottom: "1px solid #e5e5e5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Button
        type="text"
        aria-label={mobile ? "Mở menu" : "Thu gọn menu"}
        icon={
          mobile ? (
            <MenuOutlined />
          ) : collapsed ? (
            <MenuUnfoldOutlined />
          ) : (
            <MenuFoldOutlined />
          )
        }
        onClick={() => {
          if (mobile) {
            onOpenMenu();
          } else {
            setCollapsed(!collapsed);
          }
        }}
        style={{ fontSize: 18, width: 44, height: 44 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: mobile ? 4 : 16,
          minWidth: 0,
        }}
      >
        <NotificationBell role={role} mobile={mobile} />
        {!mobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              minHeight: 44,
            }}
          >
            <Avatar
              size={36}
              style={{ backgroundColor: "#4d74ea", flexShrink: 0 }}
              icon={<UserOutlined />}
            />

            {!mobile && (
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  lineHeight: 1.3,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                  }}
                >
                  {displayName}
                </span>
                <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                  {ROLE_LABELS[role] || ""}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </Header>
  );
};

export default HeaderBar;
