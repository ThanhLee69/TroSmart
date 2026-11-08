package com.project.trosmart.service;

import com.project.trosmart.dto.request.ContactRequest;
import com.project.trosmart.dto.request.ContactUpdateRequest;
import com.project.trosmart.dto.response.ContactResponse;
import com.project.trosmart.dto.response.ContactSummaryResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.ContactStatus;
import com.project.trosmart.enums.ContactTopic;

public interface ContactService {


    // ===== ADMIN =====

    // Danh sách, tìm theo tên/SĐT/email, lọc theo trạng thái và nhu cầu
    PageResponse<ContactResponse> getContacts(String keyword,
                                              ContactStatus status,
                                              ContactTopic topic,
                                              int page,
                                              int size);

    // Xem chi tiết, tự chuyển NEW thành READ
    ContactResponse getContactDetail(Long id);

    // Đổi trạng thái và ghi chú
    ContactResponse updateContact(Long id, ContactUpdateRequest request);

    // Xóa hẳn liên hệ
    void deleteContact(Long id);

    // Thống kê theo trạng thái
    ContactSummaryResponse getSummary();
}
