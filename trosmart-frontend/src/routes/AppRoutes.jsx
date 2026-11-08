import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import PublicLayout from "../layouts/PublicLayout";
import { path_name } from "../constants/path_name";

// Public pages
import HomePage from "../pages/public/home/HomePage";
import RoomDetail from "../pages/public/room-detail/RoomDetail";
import About from "../pages/public/about/About";
import Contact from "../pages/public/contact/Contact";
import RoomSearchPage from "../pages/public/room/RoomSearchPage";

// Admin pages
import DashboardPage from "../pages/admin/dashboard/DashboardPage";
import BuildingPage from "../pages/admin/building/BuildingPage";
import AmenityPage from "../pages/admin/amenity/AmenityPage";
import UserPage from "../pages/admin/user/UserPage";
import RoomPage from "../pages/admin/rooms/RoomPage";
import RoomDetailPage from "../pages/admin/rooms/RoomDetailPage";
import TenantPage from "../pages/admin/tenant/TenantPage";
import ContractPage from "../pages/admin/contract/ContractPage";
import InvoicePage from "../pages/admin/invoice/InvoicePage";
import InvoiceForm from "../pages/admin/invoice/InvoiceForm";
import IssuePage from "../pages/admin/issue/IssuePage";
import ContactPage from "../pages/admin/contact/ContactPage";
import NotificationPage from "../pages/admin/notificaation/NotificationPage";
import MeterReadingPage from "../pages/admin/meter/MeterReadingPage";
import MeterReadingDetail from "../pages/admin/meter/MeterReadingDetail";
import Login from "../pages/auth/Login";

import ProtectedRoute from "./ProtectedRoute";
import TenantVehiclePage from "../pages/admin/vehicle/TenantVehiclePage";
import TenantDetailPage from "../pages/admin/tenant/TenantDetailPage";
import ServicePage from "../pages/admin/service/ServicePage";
import ContractDetailPage from "../pages/admin/contract/ContractDetailPage";
import ContractForm from "../pages/admin/contract/ContractForm";
import InvoiceDetail from "../pages/admin/invoice/InvoiceDetail";

// Khu vực khách thuê (đặt tên khác để không trùng TenantPage của admin)
import TenantAreaPage, { TENANT_ROUTES } from "../pages/tenant/TenantPage";

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Website public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route path={path_name.roomSearch} element={<RoomSearchPage />} />

        <Route path={path_name.publicRoomDetail} element={<RoomDetail />} />

        <Route path={path_name.about} element={<About />} />

        <Route path={path_name.contact} element={<Contact />} />
      </Route>

      {/* Đăng nhập */}
      <Route path={path_name.login} element={<Login />} />

      {/* Các trang quản trị cần đăng nhập */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path={path_name.dashboard} element={<DashboardPage />} />
        <Route path={path_name.user} element={<UserPage />} />
        <Route path={path_name.building} element={<BuildingPage />} />
        <Route path={path_name.amenity} element={<AmenityPage />} />
        <Route path={path_name.service} element={<ServicePage />} />
        <Route path={path_name.tenantVehicle} element={<TenantVehiclePage />} />
        {/* Danh sách phòng */}
        <Route path={path_name.room} element={<RoomPage />} />

        <Route path={path_name.roomDetail} element={<RoomDetailPage />} />
        <Route path={path_name.tenant} element={<TenantPage />} />
        <Route
          path={`${path_name.tenant}/:id`}
          element={<TenantDetailPage />}
        />
        <Route path={path_name.contract} element={<ContractPage />} />
        {/* Thêm hợp đồng */}
        <Route
          path={`${path_name.contract}/them-moi`}
          element={<ContractForm />}
        />

        {/* Sửa hợp đồng */}
        <Route
          path={`${path_name.contract}/:id/cap-nhat`}
          element={<ContractForm />}
        />

        {/* Chi tiết hợp đồng */}
        <Route
          path={`${path_name.contract}/:id`}
          element={<ContractDetailPage />}
        />

        <Route path={path_name.invoice} element={<InvoicePage />} />
        <Route path={path_name.invoiceCreate} element={<InvoiceForm />} />
        <Route path={path_name.invoiceDetail} element={<InvoiceDetail />} />
        <Route path={path_name.meter} element={<MeterReadingPage />} />
        <Route
          path={`${path_name.meter}/phong/:roomId`}
          element={<MeterReadingDetail />}
        />

        <Route path={path_name.issue} element={<IssuePage />} />
        <Route path={path_name.notification} element={<NotificationPage />} />
        <Route path={path_name.contactManage} element={<ContactPage />} />

        {/* Khu vực khách thuê: /cua-toi/... */}
        {TENANT_ROUTES.map(({ path, page }) => (
          <Route
            key={path}
            path={path}
            element={<TenantAreaPage page={page} />}
          />
        ))}
      </Route>

      {/* Đường dẫn không tồn tại */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
