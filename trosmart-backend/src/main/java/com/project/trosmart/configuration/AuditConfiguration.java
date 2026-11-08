package com.project.trosmart.configuration;

import com.project.trosmart.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
@RequiredArgsConstructor
public class AuditConfiguration {

    private final UserRepository userRepository;

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> {
            Authentication authentication =
                    SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null
                    || !authentication.isAuthenticated()
                    || "anonymousUser".equals(authentication.getPrincipal())) {
                return Optional.empty();
            }

            // Hàm này chạy bên trong lúc Hibernate flush (AuditingEntityListener),
            // nên câu truy vấn dưới đây không được kích hoạt flush nữa (xem UserRepository)
            return userRepository.findFullNameByUsername(authentication.getName())
                    .filter(fullName -> !fullName.isBlank());
        };
    }
}