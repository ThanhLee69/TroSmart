
const API_CONFIG = {
  BASE_URL:
    process.env.REACT_APP_API_URL || "http://localhost:8080/api/v1",
  AUTH: "/auth",
  AUTH_REFRESH: "/auth/refresh",
  BUILDING: "/buildings",
  AMENITY: "/amenities",
  NOTIFICATION: "/notifications",
  ROOM: "/rooms",
  USER: "/users",
  ROOM_IMAGE: "/room-images",
  TENANT: "/tenants",
  TENANT_VEHICLE: "/vehicles",
  CONTRACT: "/contracts",
  SERVICE: "/service-items",
  METER: "/meter-readings",
  INVOICE: "/invoices",
  PAYMENT: "/payments",
  DASHBOARD: "/dashboard",
  ISSUE: "/issues",
  PUBLIC: "/public",
  TENANT_ME:"/tenant",
  CONTACT: "/contacts",
};

export default API_CONFIG;
