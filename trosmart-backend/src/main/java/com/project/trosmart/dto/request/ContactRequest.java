package com.project.trosmart.dto.request;

import com.project.trosmart.enums.ContactTopic;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

// Khách gửi từ web public (không cần đăng nhập)
@Getter
@Setter
public class ContactRequest {

    @NotBlank(message = "Vui lòng nhập họ và tên")
    @Size(max = 100, message = "Họ và tên tối đa 100 ký tự")
    private String fullName;

    // Giống regex ở frontend: 0xxxxxxxxx hoặc +84xxxxxxxxx (cho phép dấu cách)
    @NotBlank(message = "Vui lòng nhập số điện thoại")
    @Pattern(regexp = "^(0|\\+84)(\\s?\\d){9}$", message = "Số điện thoại chưa đúng")
    private String phone;

    @Email(message = "Email chưa đúng định dạng")
    @Size(max = 150, message = "Email tối đa 150 ký tự")
    private String email;

    @NotNull(message = "Vui lòng chọn nhu cầu")
    private ContactTopic topic;

    @NotBlank(message = "Vui lòng nhập nội dung")
    @Size(min = 10, max = 1000, message = "Nội dung từ 10 đến 1000 ký tự")
    private String message;

    // Có khi gửi từ trang chi tiết phòng, liên hệ chung thì để trống
    private Long roomId;

    // ===== Các trường chống spam =====

    // Ô ẩn (honeypot): người thật không thấy nên không điền, bot thì điền
    @Size(max = 200)
    private String website;

    // Số mili giây từ lúc mở form đến lúc bấm gửi, bắt buộc phải có
    @NotNull(message = "Yêu cầu không hợp lệ")
    @PositiveOrZero
    private Long elapsedMs;

    // Token của Cloudflare Turnstile (chỉ cần khi bật captcha)
    @Size(max = 2048)
    private String captchaToken;
}
