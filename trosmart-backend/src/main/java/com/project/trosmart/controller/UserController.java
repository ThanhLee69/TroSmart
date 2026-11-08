package com.project.trosmart.controller;

import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.UserResponse;
import com.project.trosmart.enums.Role;
import com.project.trosmart.enums.UserStatus;
import com.project.trosmart.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Quản lý tài khoản người dùng. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j(topic = "USER-CONTROLLER")
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý tài khoản",
        description = "API quản lý tài khoản người dùng, chỉ dành cho quản trị viên (ADMIN)"
)
public class UserController {

    private final UserService userService;

    @PostMapping("/tenants/{tenantId}")
    @Operation(
            summary = "Tạo tài khoản cho khách thuê",
            description = "Tạo tài khoản đăng nhập cho khách thuê dựa trên hồ sơ khách thuê đã có"
    )
    public ApiResponse<UserResponse> createTenantAccount(
            @Parameter(description = "ID hồ sơ khách thuê cần tạo tài khoản", example = "1")
            @PathVariable @NotNull Long tenantId
    ) {
        UserResponse response = userService.createTenantAccount(tenantId);

        return ApiResponse.<UserResponse>builder()
                .code(201)
                .message("Tenant account created successfully")
                .result(response)
                .build();
    }

    @GetMapping
    @Operation(
            summary = "Xem danh sách tài khoản",
            description = "Tìm kiếm, lọc theo vai trò và trạng thái, có phân trang"
    )
    public ApiResponse<PageResponse<UserResponse>> getAllUsers(
            @Parameter(description = "Từ khóa tìm kiếm (tên, tên đăng nhập, email...). Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo vai trò. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) Role role,

            @Parameter(description = "Lọc theo trạng thái tài khoản. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) UserStatus status,

            @Parameter(description = "Số trang, bắt đầu từ 1", example = "1")
            @RequestParam(defaultValue = "1")
            @Min(value = 1, message = "Trang phải lớn hơn hoặc bằng 1")
            int page,

            @Parameter(description = "Số bản ghi mỗi trang, từ 1 đến 100", example = "10")
            @RequestParam(defaultValue = "10")
            @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
            @Max(value = 100, message = "Kích thước trang tối đa là 100")
            int size
    ) {
        PageResponse<UserResponse> response =
                userService.getAllUsers(page, size, keyword, role, status);

        return ApiResponse.<PageResponse<UserResponse>>builder()
                .code(200)
                .message("Get users successfully")
                .result(response)
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết tài khoản",
            description = "Lấy thông tin tài khoản theo ID"
    )
    public ApiResponse<UserResponse> getUserById(
            @Parameter(description = "ID tài khoản", example = "1")
            @PathVariable Long id
    ) {
        UserResponse response = userService.getUserById(id);

        return ApiResponse.<UserResponse>builder()
                .code(200)
                .message("Get user successfully")
                .result(response)
                .build();
    }

    @PatchMapping("/{id}/status")
    @Operation(
            summary = "Cập nhật trạng thái tài khoản",
            description = "Kích hoạt hoặc vô hiệu hóa tài khoản"
    )
    public ApiResponse<UserResponse> updateUserStatus(
            @Parameter(description = "ID tài khoản", example = "1")
            @PathVariable Long id,

            @Parameter(description = "Trạng thái mới của tài khoản", required = true)
            @RequestParam @NotNull UserStatus status
    ) {
        UserResponse response = userService.updateUserStatus(id, status);

        return ApiResponse.<UserResponse>builder()
                .code(200)
                .message("User status updated successfully")
                .result(response)
                .build();
    }

    @PostMapping("/{id}/reset-password")
    @Operation(
            summary = "Đặt lại mật khẩu",
            description = "Tạo mật khẩu tạm thời mới cho tài khoản và trả về mật khẩu đó trong kết quả"
    )
    public ApiResponse<String> resetPassword(
            @Parameter(description = "ID tài khoản", example = "1")
            @PathVariable Long id
    ) {
        String temporaryPassword = userService.resetPassword(id);

        return ApiResponse.<String>builder()
                .code(200)
                .message("Password reset successfully")
                .result(temporaryPassword)
                .build();
    }
}