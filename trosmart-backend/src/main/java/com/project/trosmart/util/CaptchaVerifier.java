package com.project.trosmart.util;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.exception.AppException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

// Xác thực token Cloudflare Turnstile ở server.
// Mặc định TẮT (app.captcha.enabled=false) để dev không bị chặn; bật khi triển khai thật.
@Slf4j
@Component
public class CaptchaVerifier {

    private static final String VERIFY_URL =
            "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Value("${app.captcha.enabled:false}")
    private boolean enabled;

    @Value("${app.captcha.secret:}")
    private String secret;

    private final RestTemplate restTemplate;

    public CaptchaVerifier() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(3000);
        this.restTemplate = new RestTemplate(factory);
    }

    public void verify(String token, String clientIp) {
        if (!enabled) {
            return;
        }

        if (token == null || token.isBlank()) {
            throw new AppException(ErrorCode.CAPTCHA_INVALID);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("secret", secret);
            form.add("response", token);
            form.add("remoteip", clientIp);

            Map<?, ?> body = restTemplate.postForObject(
                    VERIFY_URL, new HttpEntity<>(form, headers), Map.class);

            if (body == null || !Boolean.TRUE.equals(body.get("success"))) {
                throw new AppException(ErrorCode.CAPTCHA_INVALID);
            }
        } catch (RestClientException e) {
            // Không gọi được Cloudflare thì từ chối (an toàn hơn cho phép)
            log.error("Không xác thực được captcha: {}", e.getMessage());
            throw new AppException(ErrorCode.CAPTCHA_INVALID);
        }
    }
}
