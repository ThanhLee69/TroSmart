import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import PublicHeader from "./components/public/PublicHeader";
import PublicFooter from "./components/public/PublicFooter";

export default function PublicLayout() {
  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <PublicHeader />

      <Layout.Content style={{ flex: 1 }}>
        <Outlet />
      </Layout.Content>

      <PublicFooter />
    </Layout>
  );
}
