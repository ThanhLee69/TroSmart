
        package com.project.trosmart.configuration;

import com.project.trosmart.entity.ServiceItem;
import com.project.trosmart.entity.User;
import com.project.trosmart.enums.BillingType;
import com.project.trosmart.enums.Role;
import com.project.trosmart.enums.ServiceCode;
import com.project.trosmart.enums.UserStatus;
import com.project.trosmart.repository.ServiceItemRepository;
import com.project.trosmart.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;

@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ApplicationInitConfiguration {

    PasswordEncoder passwordEncoder;

    @NonFinal
    static final String ADMIN_USER_NAME = "admin";

    @NonFinal
    static final String ADMIN_PASSWORD = "123@123";

    @Bean
    ApplicationRunner applicationRunner(
            UserRepository userRepository,
            ServiceItemRepository serviceItemRepository
    ) {
        log.info("Initializing application.....");

        return args -> {
            // Khởi tạo tài khoản ADMIN
            if (userRepository
                    .findByUsernameAndDeletedFalse(ADMIN_USER_NAME)
                    .isEmpty()) {

                User user = User.builder()
                        .username(ADMIN_USER_NAME)
                        .password(passwordEncoder.encode(ADMIN_PASSWORD))
                        .fullName("Le Dang Thanh")
                        .status(UserStatus.ACTIVE)
                        .role(Role.ADMIN)
                        .mustChangePassword(true)
                        .build();

                userRepository.save(user);

                log.warn(
                        "Admin user created with default password. "
                                + "Password change is required!"
                );
            }

            // Khởi tạo dịch vụ Điện mặc định
            createDefaultServiceIfNotExists(
                    serviceItemRepository,
                    "Điện",
                    new BigDecimal("3500"),
                    "kWh",
                    BillingType.USAGE,
                    ServiceCode.ELECTRICITY,
                    true,
                    "Dịch vụ điện tính theo chỉ số công tơ."
            );

            // Khởi tạo dịch vụ Nước mặc định
            createDefaultServiceIfNotExists(
                    serviceItemRepository,
                    "Nước",
                    new BigDecimal("25000"),
                    "m³",
                    BillingType.USAGE,
                    ServiceCode.WATER,
                    true,
                    "Dịch vụ nước tính theo chỉ số đồng hồ nước."
            );

            // Khởi tạo dịch vụ Phí gửi xe
            // Không tự động chọn khi tạo hợp đồng
            createDefaultServiceIfNotExists(
                    serviceItemRepository,
                    "Phí gửi xe",
                    new BigDecimal("100000"),
                    "xe/tháng",
                    BillingType.USAGE,
                    ServiceCode.PARKING,
                    false,
                    "Phí gửi xe được tính theo số xe đăng ký."
            );

            log.info("Application initialization completed.");
        };
    }

    private void createDefaultServiceIfNotExists(
            ServiceItemRepository repository,
            String name,
            BigDecimal unitPrice,
            String unit,
            BillingType billingType,
            ServiceCode serviceCode,
            boolean defaultService,
            String description
    ) {
        if (repository.existsByServiceCodeAndDeletedFalse(serviceCode)) {
            log.info("Service already exists: {}", serviceCode);
            return;
        }

        ServiceItem service = ServiceItem.builder()
                .name(name)
                .unitPrice(unitPrice)
                .unit(unit)
                .billingType(billingType)
                .serviceCode(serviceCode)
                .defaultService(defaultService)
                .description(description)
                .build();

        repository.save(service);

        log.info("Created service: {}", name);
    }
}
