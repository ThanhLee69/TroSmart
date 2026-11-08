import { tenant_path_name } from "../../context/PermissionContext";
import TenantHome from "./TenantHome";
import TenantRoom from "./TenantRoom";
import TenantInvoices from "./TenantInvoices";
import TenantInvoiceDetail from "./TenantInvoiceDetail";
import TenantIssues from "./TenantIssues";
import TenantNotifications from "./TenantNotifications";
import TenantProfile from "./TenantProfile";

/* Mỗi key khớp với key trong tenant_path_name (constants/path_name.js). */
const PAGES = {
  home: TenantHome,
  contract: TenantRoom,
  invoice: TenantInvoices,
  invoiceDetail: TenantInvoiceDetail,
  issue: TenantIssues,
  notification: TenantNotifications,
  profile: TenantProfile,
};

export default function TenantPage({ page }) {
  const Page = PAGES[page] || TenantHome;
  return <Page />;
}

/* Danh sách route của khu vực khách thuê, dùng trong AppRoutes */
export const TENANT_ROUTES = Object.keys(PAGES).map((page) => ({
  path: tenant_path_name[page],
  page,
}));
