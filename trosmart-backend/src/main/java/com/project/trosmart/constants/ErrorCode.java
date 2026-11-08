package com.project.trosmart.constants;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
public enum ErrorCode {

    // =======================
    // LỖI CHUNG / HỆ THỐNG (1000)
    // =======================
    UNCATEGORIZED_EXCEPTION(1000, "Lỗi hệ thống chưa được xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Khóa yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    INVALID_REQUEST(1002, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    TOO_MANY_REQUESTS(1003, "Bạn thao tác quá nhiều lần, vui lòng thử lại sau", HttpStatus.TOO_MANY_REQUESTS),
    CAPTCHA_INVALID(1004, "Xác minh không hợp lệ, vui lòng thử lại", HttpStatus.BAD_REQUEST),

    // =======================
    // XÁC THỰC / BẢO MẬT (1100)
    // =======================
    UNAUTHENTICATED(1100, "Bạn chưa đăng nhập", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1101, "Bạn không có quyền thực hiện thao tác này", HttpStatus.FORBIDDEN),
    TOKEN_INVALID(1102, "Mã xác thực không hợp lệ", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED(1103, "Mã xác thực đã hết hạn", HttpStatus.UNAUTHORIZED),
    TOKEN_REUSED(1104, "Mã làm mới phiên đăng nhập đã được sử dụng", HttpStatus.UNAUTHORIZED),
    TOKEN_REVOKED(1105, "Mã xác thực đã bị thu hồi", HttpStatus.UNAUTHORIZED),
    USER_LOCKED(1106, "Tài khoản đã bị khóa", HttpStatus.FORBIDDEN),

    // =======================
    // NGƯỜI DÙNG / TÀI KHOẢN (2000)
    // =======================
    USER_EXISTED(2000, "Tài khoản đã tồn tại", HttpStatus.BAD_REQUEST),
    USER_NOT_FOUND(2001, "Không tìm thấy tài khoản", HttpStatus.NOT_FOUND),
    USERNAME_INVALID(2002, "Tên đăng nhập phải có ít nhất {min} ký tự", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(2003, "Mật khẩu phải có ít nhất {min} ký tự", HttpStatus.BAD_REQUEST),
    PASSWORD_CURRENT_INVALID(2004, "Mật khẩu hiện tại không chính xác", HttpStatus.BAD_REQUEST),
    PASSWORD_CONFIRMATION_MISMATCH(2005, "Mật khẩu xác nhận không khớp", HttpStatus.BAD_REQUEST),
    PASSWORD_SAME_AS_OLD(2006, "Mật khẩu mới phải khác mật khẩu hiện tại", HttpStatus.BAD_REQUEST),

    // =======================
    // TÒA NHÀ / PHÒNG / TIỆN NGHI (3000)
    // =======================
    BUILDING_NOT_FOUND(3000, "Không tìm thấy tòa nhà", HttpStatus.NOT_FOUND),
    ROOM_NOT_FOUND(3001, "Không tìm thấy phòng", HttpStatus.NOT_FOUND),
    AMENITY_NOT_FOUND(3002, "Không tìm thấy tiện nghi", HttpStatus.NOT_FOUND),
    AMENITY_EXISTED(3003, "Tiện nghi đã tồn tại", HttpStatus.BAD_REQUEST),
    AMENITY_INVALID_SCOPE(3004, "Tiện nghi không áp dụng được cho đối tượng này", HttpStatus.BAD_REQUEST),
    ROOM_MAX_OCCUPANCY_EXCEEDED(3015, "Phòng đã đủ số người tối đa", HttpStatus.CONFLICT),
    ROOM_IMAGE_NOT_FOUND(3005, "Không tìm thấy ảnh phòng", HttpStatus.NOT_FOUND),
    ROOM_IMAGE_LIMIT_EXCEEDED(3006, "Số lượng ảnh phòng vượt quá giới hạn cho phép", HttpStatus.BAD_REQUEST),
    ROOM_IMAGE_FILE_EMPTY(3007, "Tệp ảnh không được để trống", HttpStatus.BAD_REQUEST),
    ROOM_IMAGE_FILE_TOO_LARGE(3008, "Dung lượng ảnh không được vượt quá 5 MB", HttpStatus.BAD_REQUEST),
    ROOM_IMAGE_INVALID_TYPE(3009, "Chỉ chấp nhận ảnh định dạng JPEG, PNG hoặc WEBP", HttpStatus.BAD_REQUEST),
    ROOM_IMAGE_UPLOAD_FAILED(3010, "Tải ảnh phòng lên thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    ROOM_IMAGE_DELETE_FAILED(3011, "Xóa ảnh phòng thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    ROOM_NUMBER_ALREADY_EXISTS(3012, "Số phòng đã tồn tại trong tòa nhà này", HttpStatus.CONFLICT),
    ROOM_STATUS_INVALID(3013, "Trạng thái phòng không hợp lệ", HttpStatus.BAD_REQUEST),
    ROOM_NOT_AVAILABLE_FOR_CONTRACT(3014, "Phòng không khả dụng để tạo hợp đồng", HttpStatus.CONFLICT),
    ROOM_CANNOT_START_MAINTENANCE(3015,"Chỉ có thể tạm khóa phòng đang trống", HttpStatus.BAD_REQUEST),
    ROOM_NOT_IN_MAINTENANCE(3016,"Phòng không ở trạng thái bảo trì", HttpStatus.BAD_REQUEST),
    ROOM_HAS_ACTIVE_CONTRACT(3017,"Phòng đang có hợp đồng hiệu lực, không thể xóa", HttpStatus.BAD_REQUEST),
    ROOM_RESERVED_CANNOT_DELETE(3018,"Phòng đã được đặt trước, không thể xóa", HttpStatus.BAD_REQUEST),

    // =======================
    // HỢP ĐỒNG / KHÁCH THUÊ (4000)
    // =======================
    CONTRACT_NOT_FOUND(4000, "Không tìm thấy hợp đồng", HttpStatus.NOT_FOUND),
    TENANT_NOT_FOUND(4001, "Không tìm thấy khách thuê", HttpStatus.NOT_FOUND),
    TENANT_PHONE_EXISTED(4002, "Số điện thoại khách thuê đã tồn tại", HttpStatus.CONFLICT),
    TENANT_IDENTITY_NUMBER_EXISTED(4003, "Số CCCD/CMND của khách thuê đã tồn tại", HttpStatus.CONFLICT),
    TENANT_HAS_ACCOUNT(4004, "Khách thuê đã có tài khoản", HttpStatus.CONFLICT),
    TENANT_IDENTITY_IMAGE_UPLOAD_FAILED(4005, "Tải ảnh giấy tờ tùy thân của khách thuê lên thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    TENANT_HAS_ACTIVE_CONTRACT(4006, "Không thể xóa khách thuê đang có hợp đồng còn hiệu lực", HttpStatus.CONFLICT),
    CONTRACT_PDF_EXPORT_FAILED(4026,"Không thể xuất file PDF hợp đồng",HttpStatus.INTERNAL_SERVER_ERROR),
    TENANT_VEHICLE_NOT_FOUND(4007, "Không tìm thấy phương tiện của khách thuê", HttpStatus.NOT_FOUND),
    TENANT_VEHICLE_PLATE_EXISTED(4008, "Biển số phương tiện đã tồn tại", HttpStatus.CONFLICT),
    TENANT_VEHICLE_INVALID_PAGE(4009, "Số trang phải lớn hơn hoặc bằng 0", HttpStatus.BAD_REQUEST),
    TENANT_VEHICLE_INVALID_SIZE(4010, "Kích thước trang phải lớn hơn 0", HttpStatus.BAD_REQUEST),
    CONTRACT_SERVICE_REQUIRED(4023, "Dịch vụ bắt buộc (điện, nước, mặc định) không thể bỏ khỏi hợp đồng", HttpStatus.BAD_REQUEST),
    CONTRACT_INVALID_STATUS(4011, "Trạng thái hợp đồng không cho phép thực hiện thao tác này", HttpStatus.CONFLICT),
    CONTRACT_INVALID_DATES(4012, "Ngày kết thúc hợp đồng phải sau ngày bắt đầu", HttpStatus.BAD_REQUEST),
    CONTRACT_ROOM_OVERLAPPING(4013, "Phòng đã có hợp đồng đang hoạt động trong khoảng thời gian này", HttpStatus.CONFLICT),
    CONTRACT_INVALID_EXTENSION_DATE(4014, "Ngày kết thúc mới phải sau ngày kết thúc hiện tại", HttpStatus.BAD_REQUEST),
    CONTRACT_INVALID_RENT_PRICE(4015, "Giá thuê hợp đồng phải lớn hơn 0", HttpStatus.BAD_REQUEST),
    CONTRACT_INVALID_TERMINATION_REASON(4016, "Vui lòng nhập lý do chấm dứt hợp đồng", HttpStatus.BAD_REQUEST),
    CONTRACT_INVALID_TENANTS(4017, "Danh sách khách thuê không hợp lệ", HttpStatus.BAD_REQUEST),
    CONTRACT_DUPLICATE_TENANTS(4018, "Danh sách khách thuê không được trùng ID", HttpStatus.BAD_REQUEST),
    CONTRACT_INVALID_PRIMARY_TENANT(4019, "Người đứng tên hợp đồng không hợp lệ hoặc bị trùng trong danh sách người ở cùng", HttpStatus.BAD_REQUEST),
    CONTRACT_TENANT_OVERLAPPING(4020, "Khách thuê đã có hợp đồng đang hiệu lực trong khoảng thời gian này", HttpStatus.BAD_REQUEST),
    CONTRACT_SERVICE_DUPLICATE(4021, "Danh sách dịch vụ không được trùng ID", HttpStatus.BAD_REQUEST),
    CONTRACT_SERVICE_NOT_FOUND(4022, "Một hoặc nhiều dịch vụ không tồn tại", HttpStatus.NOT_FOUND),
    CONTRACT_TENANT_NOT_FOUND(4023, "Người thuê không ở trong hợp đồng này", HttpStatus.NOT_FOUND),
    CONTRACT_CANNOT_REMOVE_PRIMARY_TENANT(4024, "Không thể bớt người đứng tên chính, hãy chấm dứt hợp đồng", HttpStatus.CONFLICT),
    CONTRACT_INVALID_SERVICE_PRICE(4025, "Đơn giá dịch vụ không hợp lệ", HttpStatus.BAD_REQUEST),
    // =======================
    // HÓA ĐƠN / THANH TOÁN (4100)
    // =======================
    INVOICE_NOT_FOUND(4100, "Không tìm thấy hóa đơn", HttpStatus.NOT_FOUND),
    PAYMENT_EXCEEDS_TOTAL(4101, "Số tiền thanh toán vượt quá tổng tiền hóa đơn", HttpStatus.BAD_REQUEST),
    INVALID_PAYMENT_AMOUNT(4102, "Số tiền thanh toán phải lớn hơn 0", HttpStatus.BAD_REQUEST),
    INVOICE_INVALID_PERIOD(4103, "Kỳ hóa đơn không hợp lệ hoặc nằm ở tương lai", HttpStatus.BAD_REQUEST),
    INVOICE_PERIOD_OUT_OF_CONTRACT(4104, "Kỳ hóa đơn nằm ngoài thời hạn hợp đồng", HttpStatus.BAD_REQUEST),
    INVOICE_DUPLICATE_PERIOD(4105, "Hợp đồng đã có hóa đơn trong kỳ này", HttpStatus.CONFLICT),
    INVOICE_CONTRACT_NOT_ACTIVE(4106, "Chỉ lập hóa đơn cho hợp đồng đang hiệu lực", HttpStatus.CONFLICT),
    INVOICE_METER_READING_MISSING(4107, "Phòng chưa ghi đủ chỉ số điện nước của kỳ này", HttpStatus.BAD_REQUEST),
    INVOICE_METER_READING_ALREADY_USED(4108, "Chỉ số điện nước của kỳ này đã được dùng cho hóa đơn khác", HttpStatus.CONFLICT),
    INVOICE_INVALID_DATES(4109, "Hạn thanh toán không được trước ngày lập hóa đơn", HttpStatus.BAD_REQUEST),
    INVOICE_INVALID_ITEM_TYPE(4110, "Chỉ được nhập tay phụ phí hoặc giảm giá", HttpStatus.BAD_REQUEST),
    INVOICE_INVALID_ITEM(4111, "Dòng hóa đơn không hợp lệ", HttpStatus.BAD_REQUEST),
    INVOICE_INVALID_TOTAL(4112, "Tổng tiền hóa đơn phải lớn hơn 0", HttpStatus.BAD_REQUEST),
    INVOICE_INVALID_STATUS(4113, "Trạng thái hóa đơn không cho phép thao tác này", HttpStatus.CONFLICT),
    INVOICE_HAS_PAYMENTS(4114, "Hóa đơn đã có thanh toán, không thể hủy", HttpStatus.CONFLICT),
    INVOICE_CANCEL_REASON_REQUIRED(4115, "Vui lòng nhập lý do hủy hóa đơn", HttpStatus.BAD_REQUEST),
    INVOICE_ALREADY_PAID(4116, "Hóa đơn đã được thanh toán đủ", HttpStatus.CONFLICT),
    PAYMENT_NOT_FOUND(4117, "Không tìm thấy khoản thanh toán", HttpStatus.NOT_FOUND),
    PAYMENT_DATE_INVALID(4118, "Ngày thanh toán không được trước ngày lập hóa đơn", HttpStatus.BAD_REQUEST),
    PAYMENT_TRANSACTION_DUPLICATE(4119, "Mã giao dịch đã tồn tại", HttpStatus.CONFLICT),
    INVOICE_PDF_EXPORT_FAILED(4120, "Không thể xuất file PDF hóa đơn", HttpStatus.INTERNAL_SERVER_ERROR),
    // =======================
    // DỊCH VỤ (4200)
    // =======================
    SERVICE_NOT_FOUND(4200, "Không tìm thấy dịch vụ", HttpStatus.NOT_FOUND),
    SERVICE_ITEM_EXISTED(4201, "Dịch vụ đã tồn tại", HttpStatus.CONFLICT),
    SERVICE_ITEM_NOT_FOUND(4202, "Không tìm thấy dịch vụ", HttpStatus.NOT_FOUND),

    // =======================
    // SỰ CỐ / SỬA CHỮA (4300)
    // =======================
    ISSUE_NOT_FOUND(4300, "Không tìm thấy sự cố", HttpStatus.NOT_FOUND),
    ISSUE_INVALID_STATUS(4301, "Trạng thái sự cố không hợp lệ", HttpStatus.BAD_REQUEST),
    ISSUE_CANNOT_CANCEL(4302, "Không thể hủy sự cố này", HttpStatus.CONFLICT),
    ISSUE_ALREADY_COMPLETED(4303, "Sự cố đã được hoàn thành", HttpStatus.CONFLICT),
    ISSUE_ALREADY_CANCELLED(4304, "Sự cố đã được hủy", HttpStatus.CONFLICT),
    ISSUE_ROOM_NOT_RENTED(4305, "Bạn không có hợp đồng thuê còn hiệu lực đối với phòng này", HttpStatus.FORBIDDEN),
    ISSUE_INVALID_REPAIR_COST(4306, "Chi phí sửa chữa phải lớn hơn hoặc bằng 0", HttpStatus.BAD_REQUEST),
    ISSUE_INVALID_RESOLUTION(4307, "Không thể cập nhật kết quả xử lý cho sự cố đã bị hủy", HttpStatus.CONFLICT),
    ISSUE_IMAGE_NOT_FOUND(4308, "Không tìm thấy ảnh sự cố", HttpStatus.NOT_FOUND),
    ISSUE_IMAGE_LIMIT_EXCEEDED(4309, "Số lượng ảnh sự cố vượt quá giới hạn cho phép", HttpStatus.BAD_REQUEST),
    ISSUE_IMAGE_FILE_EMPTY(4310, "Tệp ảnh sự cố không được để trống", HttpStatus.BAD_REQUEST),
    ISSUE_IMAGE_FILE_TOO_LARGE(4311, "Dung lượng ảnh sự cố không được vượt quá 5 MB", HttpStatus.BAD_REQUEST),
    ISSUE_IMAGE_INVALID_TYPE(4312, "Chỉ chấp nhận ảnh sự cố định dạng JPEG, PNG hoặc WEBP", HttpStatus.BAD_REQUEST),
    ISSUE_IMAGE_UPLOAD_FAILED(4313, "Tải ảnh sự cố lên thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    ISSUE_IMAGE_DELETE_FAILED(4314, "Xóa ảnh sự cố thất bại", HttpStatus.INTERNAL_SERVER_ERROR),
    ISSUE_INVALID_PAGE(4315, "Số trang phải lớn hơn hoặc bằng 0", HttpStatus.BAD_REQUEST),
    ISSUE_INVALID_SIZE(4316, "Kích thước trang phải lớn hơn 0", HttpStatus.BAD_REQUEST),
    ISSUE_TENANT_MISMATCH(4317, "Sự cố không thuộc về khách thuê hiện tại", HttpStatus.FORBIDDEN),
    ISSUE_INVALID_TRANSITION(4318, "Không thể chuyển sang trạng thái sự cố này", HttpStatus.CONFLICT),

    // =======================
    // ĐIỆN NƯỚC (4400)
    // =======================
    METER_READING_NOT_FOUND(4400, "Không tìm thấy bản ghi điện nước", HttpStatus.NOT_FOUND),
    METER_READING_DUPLICATE(4401, "Phòng đã có bản ghi điện nước trong kỳ này", HttpStatus.CONFLICT),
    METER_READING_INVALID_PERIOD(4402, "Tháng hoặc năm ghi chỉ số không hợp lệ", HttpStatus.BAD_REQUEST),
    METER_READING_INVALID_INDEX(4403, "Chỉ số điện nước không hợp lệ", HttpStatus.BAD_REQUEST),
    METER_READING_ALREADY_INVOICED(4404, "Bản ghi đã lập hóa đơn, không thể chỉnh sửa hoặc xóa", HttpStatus.CONFLICT),
    METER_READING_ROOM_REQUIRED(4407, "Vui lòng chọn phòng", HttpStatus.BAD_REQUEST),
    METER_READING_DATE_INVALID(4408, "Ngày ghi chỉ số không được nằm trong tương lai", HttpStatus.BAD_REQUEST),
    METER_READING_ROOM_MISMATCH(4409, "Không được chuyển bản ghi điện nước sang phòng khác", HttpStatus.BAD_REQUEST),
    METER_READING_PRICE_INVALID(4410, "Đơn giá điện nước không hợp lệ", HttpStatus.BAD_REQUEST),
    METER_READING_ROOM_NOT_RENTED(4411, "Phòng chưa có hợp đồng đang hiệu lực nên không thể ghi chỉ số điện nước", HttpStatus.CONFLICT),METER_READING_FUTURE_PERIOD(4405, "Không thể ghi hoặc sửa chỉ số điện nước cho kỳ tương lai", HttpStatus.BAD_REQUEST),
    // =======================
    // THÔNG BÁO (4500)
    // =======================
    NOTIFICATION_NOT_FOUND(4500, "Không tìm thấy thông báo", HttpStatus.NOT_FOUND),
    NOTIFICATION_TARGET_INVALID(4501, "Đối tượng nhận không hợp lệ (thiếu tòa nhà / phòng / người thuê)", HttpStatus.BAD_REQUEST),
    NOTIFICATION_TYPE_NOT_ALLOWED(4502, "Chỉ được tạo thông báo loại Thông báo chung hoặc Bảo trì", HttpStatus.BAD_REQUEST),
    NOTIFICATION_SCHEDULE_INVALID(4503, "Thời gian hẹn gửi phải ở tương lai và không dùng cùng gửi ngay", HttpStatus.BAD_REQUEST),
    NOTIFICATION_NOT_EDITABLE(4504, "Thông báo đã gửi hoặc đã hủy, không thể thao tác", HttpStatus.CONFLICT),
    NOTIFICATION_NO_RECIPIENTS(4505, "Không có người thuê nào phù hợp để nhận thông báo", HttpStatus.BAD_REQUEST),
    NOTIFICATION_TENANT_ACCOUNT_NOT_FOUND(4506, "Tài khoản này không gắn với người thuê nào", HttpStatus.NOT_FOUND),
    NOTIFICATION_INVALID_TYPE(4501, "Chủ trọ chỉ soạn thông báo chung hoặc thông báo bảo trì", HttpStatus.BAD_REQUEST),
    NOTIFICATION_INVALID_TARGET(4502, "Đối tượng nhận thông báo không hợp lệ", HttpStatus.BAD_REQUEST),
    NOTIFICATION_INVALID_SCHEDULE(4503, "Thời gian hẹn gửi phải ở tương lai", HttpStatus.BAD_REQUEST),
    NOTIFICATION_INVALID_STATUS(4504, "Trạng thái thông báo không cho phép thao tác này", HttpStatus.CONFLICT),
    NOTIFICATION_NO_RECIPIENT(4505, "Không có khách thuê nào đang ở để nhận thông báo này", HttpStatus.CONFLICT),

    // =======================
    // LIÊN HỆ (4600)
    // =======================
    CONTACT_NOT_FOUND(4600, "Không tìm thấy liên hệ", HttpStatus.NOT_FOUND),
    CONTACT_TOO_FAST(4601, "Bạn gửi quá nhanh, vui lòng thử lại", HttpStatus.BAD_REQUEST),
    CONTACT_DUPLICATED(4602, "Bạn vừa gửi nội dung này rồi, chúng tôi sẽ liên hệ sớm", HttpStatus.CONFLICT),
    CONTACT_INVALID_CONTENT(4603, "Nội dung chứa quá nhiều đường link", HttpStatus.BAD_REQUEST),
    CONTACT_UNAVAILABLE(4604, "Hệ thống đang nhận quá nhiều yêu cầu, vui lòng gọi trực tiếp cho chủ trọ", HttpStatus.SERVICE_UNAVAILABLE);

    private final int code;
    private final String message;
    private final HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}