
package com.project.trosmart.service;

import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.UserResponse;
import com.project.trosmart.enums.Role;
import com.project.trosmart.enums.UserStatus;

public interface UserService {

    // Tạo tài khoản cho người thuê từ thông tin Tenant có sẵn
    UserResponse createTenantAccount(Long tenantId);

    // Danh sách tài khoản, hỗ trợ tìm kiếm và lọc
    PageResponse<UserResponse> getAllUsers(
            int page,
            int size,
            String keyword,
            Role role,
            UserStatus status
    );

    // Xem chi tiết tài khoản
    UserResponse getUserById(Long userId);

    // Kích hoạt hoặc vô hiệu hóa tài khoản
    UserResponse updateUserStatus(Long userId, UserStatus status);

    // Đặt lại mật khẩu và tạo mật khẩu tạm thời
    String resetPassword(Long userId);

}
