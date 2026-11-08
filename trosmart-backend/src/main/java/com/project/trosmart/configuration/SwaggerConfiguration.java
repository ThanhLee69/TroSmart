package com.project.trosmart.configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;

@Configuration
public class SwaggerConfiguration {

    private static final String BEARER_AUTH = "BearerAuth";

    /**
     * Cho phép truy cập giao diện Swagger mà không cần đăng nhập.
     * Nên tắt hoặc giới hạn khi triển khai thật (springdoc.api-docs.enabled=false).
     */
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**");
    }

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                // Áp dụng JWT cho toàn bộ API
                .addSecurityItem(new SecurityRequirement()
                        .addList(BEARER_AUTH))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH,
                                createBearerAuthScheme()))

                // Thông tin API
                .info(new Info()
                        .title("TroSmart API")
                        .description("""
                                API hệ thống quản lý nhà trọ thông minh TroSmart.

                                ## Nhóm chức năng

                                **Quản trị viên (ADMIN)**
                                - Quản lý tòa nhà, phòng, hình ảnh phòng và tiện nghi
                                - Quản lý khách thuê, phương tiện và tài khoản
                                - Quản lý hợp đồng (tạo, gia hạn, chấm dứt, người ở cùng, dịch vụ)
                                - Quản lý dịch vụ, chỉ số điện nước, hóa đơn và thanh toán
                                - Quản lý sự cố, thông báo và liên hệ của khách

                                **Khách thuê (TENANT)**
                                - Xem tổng quan, hợp đồng, xe, hóa đơn và thông báo của mình
                                - Gửi và hủy yêu cầu sửa chữa, đổi mật khẩu

                                **Công khai (không cần đăng nhập)**
                                - Tìm phòng trống, xem chi tiết phòng và phòng tương tự
                                - Xem danh sách tòa nhà và gửi liên hệ

                                ## Hướng dẫn sử dụng

                                1. Gọi `POST /api/v1/auth/login` để lấy access token.
                                2. Nhấn nút **Authorize** ở góc trên bên phải.
                                3. Dán access token vào ô **Value** rồi nhấn **Authorize**.
                                   Chỉ dán token, không gõ thêm chữ `Bearer`.
                                4. Các API cần đăng nhập sẽ tự gửi kèm token.

                                ## Quy ước chung

                                - Mọi phản hồi có dạng `{ code, message, result }`.
                                - Danh sách có phân trang dùng `page` (bắt đầu từ 1) và `size`.
                                - Không đủ quyền trả về 403, chưa đăng nhập hoặc token hết hạn trả về 401.
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("TroSmart")
                                .email("thanhld69@gmail.com")
                                .url("https://github.com/ThanhLee69/roommanagement")
                        ));
    }

    private SecurityScheme createBearerAuthScheme() {
        return new SecurityScheme()
                .name("Authorization")
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Nhập access token JWT lấy từ API đăng nhập. "
                        + "Swagger tự thêm tiền tố Bearer, không cần gõ.");
    }
}