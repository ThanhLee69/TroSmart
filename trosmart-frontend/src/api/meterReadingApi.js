import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Bỏ các tham số rỗng (undefined, null, "") để không gửi lên backend
// Ví dụ status = "" mà vẫn gửi thì backend sẽ báo lỗi chuyển kiểu enum
const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );

// Lấy danh sách ghi chỉ số theo phòng (phân trang)
// Bắt buộc có billingMonth + billingYear; phòng chưa ghi trả về status NOT_RECORDED
// status: NOT_RECORDED | RECORDED | INVOICED (không truyền = lấy tất cả)
export const getMeterReadings = async ({
  buildingId,
  billingMonth,
  billingYear,
  status,
  keyword,
  page,
  size ,
}) => {
  const response = await axiosClient.get(API_CONFIG.METER, {
    params: cleanParams({
      buildingId,
      billingMonth,
      billingYear,
      status,
      keyword: keyword?.trim(),
      page,
      size,
    }),
  });
  return response.data.result; // { items, currentPage, totalItems, totalPages, pageSize }
};

// Thống kê điện nước theo tòa nhà và kỳ ghi
// Trả về { totalElectricityConsumption, totalWaterConsumption, unrecordedRooms, recordedRooms }
export const getMeterReadingDashboard = async ({
  buildingId,
  billingMonth,
  billingYear,
}) => {
  const response = await axiosClient.get(`${API_CONFIG.METER}/dashboard`, {
    params: cleanParams({ buildingId, billingMonth, billingYear }),
  });
  return response.data.result;
};

// Lấy lịch sử ghi chỉ số của một phòng (phân trang, lọc tháng/năm tùy chọn)
export const getMeterReadingHistory = async (
  roomId,
  { billingMonth, billingYear, page = 1, size = 10 } = {}
) => {
  const response = await axiosClient.get(
    `${API_CONFIG.METER}/rooms/${roomId}/history`,
    {
      params: cleanParams({ billingMonth, billingYear, page, size }),
    }
  );
  return response.data.result;
};

// Lấy chi tiết một bản ghi
export const getMeterReadingById = async (id) => {
  const response = await axiosClient.get(`${API_CONFIG.METER}/${id}`);
  return response.data.result;
};

// Tạo bản ghi điện nước
// data: { roomId, billingMonth, billingYear, electricityStart?, electricityEnd?,
//         waterStart?, waterEnd?, recordedDate? }
// Không gửi electricityStart/waterStart thì backend lấy chỉ số cuối kỳ trước
export const createMeterReading = async (data) => {
  const response = await axiosClient.post(API_CONFIG.METER, data);
  return response.data;
};

// Cập nhật bản ghi (chỉ khi chưa lập hóa đơn; không đổi được phòng và kỳ ghi)
// Field nào không gửi thì backend giữ nguyên giá trị cũ
export const updateMeterReading = async (id, data) => {
  const response = await axiosClient.put(`${API_CONFIG.METER}/${id}`, data);
  return response.data;
};

