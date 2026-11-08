import React from "react";
import { Layout } from "antd";

const { Footer } = Layout;

const FooterBar = ({ mobile }) => {
  return (
    <Footer
      style={{
        textAlign: "center",
        background: "#fff",
        borderTop: "1px solid #e5e5e5",
        padding: mobile ? "12px 8px" : "10px 0",
        fontSize: mobile ? 12 : 14,
        color: "#666",
        overflowWrap: "anywhere",
      }}
    >
      © {new Date().getFullYear()} Room Management System — Thanh Le
    </Footer>
  );
};

export default FooterBar;
