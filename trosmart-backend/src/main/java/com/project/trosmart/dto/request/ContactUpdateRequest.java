package com.project.trosmart.dto.request;

import com.project.trosmart.enums.ContactStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

// Admin cập nhật trạng thái xử lý và ghi chú
@Getter
@Setter
public class ContactUpdateRequest {

    @NotNull(message = "Vui lòng chọn trạng thái")
    private ContactStatus status;

    // null = giữ nguyên ghi chú cũ, chuỗi rỗng = xóa ghi chú
    @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
    private String adminNote;
}
