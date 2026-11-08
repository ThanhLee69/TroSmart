package com.project.trosmart.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Lấy IP người gọi API.
// QUAN TRỌNG: header X-Forwarded-For do client tự gửi được, kẻ phá có thể giả để né giới hạn IP.
// Vì vậy mặc định chỉ tin IP kết nối thật. Chỉ bật trust-forward-header khi app chạy sau Nginx/Cloudflare
// và proxy đó GHI ĐÈ header này (không nối thêm).
@Component
public class ClientIpResolver {

    @Value("${app.antispam.trust-forward-header:false}")
    private boolean trustForwardHeader;

    public String resolve(HttpServletRequest request) {
        if (trustForwardHeader) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
