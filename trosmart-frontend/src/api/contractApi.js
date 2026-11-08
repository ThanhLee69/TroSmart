
import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// =========================
// DANH SÁCH HỢP ĐỒNG
// =========================
export const getContracts = async ({
  keyword,
  status,
  buildingId,
  page,
  size,
} = {}) => {
  const response = await axiosClient.get(API_CONFIG.CONTRACT, {
    params: {
      keyword,
      status,
      buildingId,
      page,
      size,
    },
  });

  return response.data.result;
};

// =========================
// CHI TIẾT HỢP ĐỒNG
// GET /contracts/{id}
// =========================
export const getContractById = async (id) => {
  const response = await axiosClient.get(
    `${API_CONFIG.CONTRACT}/${id}`
  );

  return response.data.result;
};

// =========================
// DANH SÁCH HỢP ĐỒNG ĐANG HIỆU LỰC
// GET /contracts/active
// Lưu ý: controller hiện tại chưa khai báo endpoint này.
// =========================
export const getActiveContracts = async () => {
  const response = await axiosClient.get(
    `${API_CONFIG.CONTRACT}/active`
  );

  return response.data.result;
};

// =========================
// TẠO HỢP ĐỒNG
// POST /contracts
// =========================
export const createContract = async (contract) => {
  const response = await axiosClient.post(
    API_CONFIG.CONTRACT,
    contract
  );

  return response.data;
};

// =========================
// CẬP NHẬT HỢP ĐỒNG
// PUT /contracts/{id}
// =========================
export const updateContract = async (id, contract) => {
  const response = await axiosClient.put(
    `${API_CONFIG.CONTRACT}/${id}`,
    contract
  );

  return response.data;
};

// =========================
// XÓA HỢP ĐỒNG
// DELETE /contracts/{id}
// =========================
export const deleteContract = async (id) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.CONTRACT}/${id}`
  );

  return response.data;
};

// =========================
// CHẤM DỨT HỢP ĐỒNG
// PATCH /contracts/{id}/terminate
// request: ContractTerminationRequest
// =========================
export const terminateContract = async (id, request) => {
  const response = await axiosClient.patch(
    `${API_CONFIG.CONTRACT}/${id}/terminate`,
    request
  );

  return response.data.result;
};

// =========================
// GIA HẠN HỢP ĐỒNG
// PATCH /contracts/{id}/extend
// request: ContractExtensionRequest
// =========================
export const extendContract = async (id, request) => {
  const response = await axiosClient.patch(
    `${API_CONFIG.CONTRACT}/${id}/extend`,
    request
  );

  return response.data.result;
};

// =========================
// DANH SÁCH HỢP ĐỒNG CHO SELECT
// GET /contracts/options
// =========================
export const getContractOptions = async (keyword) => {
  const response = await axiosClient.get(
    `${API_CONFIG.CONTRACT}/options`,
    {
      params: { keyword },
    }
  );

  return response.data.result;
};


// =========================
// THỐNG KÊ HỢP ĐỒNG
// GET /contracts/dashboard
// =========================
export const getContractDashboard = async () => {
  const response = await axiosClient.get(
    `${API_CONFIG.CONTRACT}/dashboard`
  );

  return response.data.result;
};
 

// Thêm người ở cùng. data: { tenantId, moveInDate? }  (moveInDate dạng "YYYY-MM-DD")
export const addCoTenant = async (contractId, data) => {
  const response = await axiosClient.post(
    `${API_CONFIG.CONTRACT}/${contractId}/co-tenants`,
    data,
  );
  return response.data;
};
 
// Bớt người ở cùng. moveOutDate (tùy chọn) dạng "YYYY-MM-DD", không gửi thì lấy hôm nay
export const removeCoTenant = async (contractId, tenantId, moveOutDate) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.CONTRACT}/${contractId}/co-tenants/${tenantId}`,
    { params: moveOutDate ? { moveOutDate } : undefined },
  );
  return response.data;
};
 
// Thêm dịch vụ vào hợp đồng. data: { serviceId, unitPrice }
export const addContractService = async (contractId, data) => {
  const response = await axiosClient.post(
    `${API_CONFIG.CONTRACT}/${contractId}/services`,
    data,
  );
  return response.data;
};
 
// Bỏ dịch vụ khỏi hợp đồng. contractServiceId = id dòng dịch vụ trong hợp đồng (service.id)
export const removeContractService = async (contractId, contractServiceId) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.CONTRACT}/${contractId}/services/${contractServiceId}`,
  );
  return response.data;
};
export const downloadContractPdf = async (contractId) => {
  try {
    const response = await axiosClient.get(
      `${API_CONFIG.CONTRACT}/${contractId}/pdf`,
      { responseType: "blob" },
    );
    return response.data;
  } catch (error) {
    const data = error?.response?.data;
 
    if (data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await data.text());
      } catch {
        // Không phải JSON thì giữ nguyên
      }
    }
 
    throw error;
  }
};