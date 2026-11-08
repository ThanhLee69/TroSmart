package com.project.trosmart.controller;

import com.project.trosmart.dto.request.IntrospectRequest;
import com.project.trosmart.dto.request.LoginRequest;
import com.project.trosmart.dto.request.LogoutRequest;
import com.project.trosmart.dto.request.RefreshTokenRequest;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.AuthResponse;
import com.project.trosmart.dto.response.IntrospectResponse;
import com.project.trosmart.dto.response.RefreshTokenResponse;
import com.project.trosmart.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Xác thực và quản lý phiên đăng nhập. Mọi vai trò đều dùng chung nên không giới hạn ADMIN:
 * đăng nhập, làm mới và kiểm tra token là công khai (cấu hình bảo mật mở /api/v1/auth/**),
 * riêng đăng xuất yêu cầu đã đăng nhập.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j(topic = "AUTH-CONTROLLER")
@Validated
@Tag(
        name = "Xác thực",
        description = "API đăng nhập, đăng xuất và quản lý phiên đăng nhập, dùng chung cho mọi vai trò"
)
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(
            summary = "Đăng nhập",
            description = "Xác thực tài khoản và cấp access token, refresh token. Không cần đăng nhập"
    )
    public ApiResponse<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthResponse response = authService.login(request);

        return ApiResponse.<AuthResponse>builder()
                .code(200)
                .message("Login successfully")
                .result(response)
                .build();
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    @Operation(
            summary = "Đăng xuất",
            description = "Vô hiệu hóa token được gửi trong yêu cầu đăng xuất. Yêu cầu đã đăng nhập"
    )
    public ApiResponse<Void> logout(
            @Valid @RequestBody LogoutRequest request
    ) {
        authService.logout(request);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Logout successfully")
                .build();
    }

    @PostMapping("/refresh-token")
    @Operation(
            summary = "Làm mới token",
            description = "Xác minh refresh token và cấp cặp token mới. Không cần access token"
    )
    public ApiResponse<RefreshTokenResponse> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        RefreshTokenResponse response =
                authService.refreshToken(request);

        return ApiResponse.<RefreshTokenResponse>builder()
                .code(200)
                .message("Refresh token successfully")
                .result(response)
                .build();
    }

    @PostMapping("/introspect")
    @Operation(
            summary = "Kiểm tra token",
            description = "Kiểm tra token còn hợp lệ hay không. Không cần đăng nhập"
    )
    public ApiResponse<IntrospectResponse> introspect(
            @Valid @RequestBody IntrospectRequest request
    ) {
        IntrospectResponse response =
                authService.introspect(request);

        return ApiResponse.<IntrospectResponse>builder()
                .code(200)
                .message("Token verification completed")
                .result(response)
                .build();
    }
}