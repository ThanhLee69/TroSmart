
package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.UserResponse;
import com.project.trosmart.entity.Tenant;
import com.project.trosmart.entity.User;
import com.project.trosmart.enums.Role;
import com.project.trosmart.enums.UserStatus;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.UserMapper;
import com.project.trosmart.repository.TenantRepository;
import com.project.trosmart.repository.UserRepository;
import com.project.trosmart.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;



    // =========================
    // TẠO TÀI KHOẢN NGƯỜI THUÊ
    // =========================

    @Override
    public UserResponse createTenantAccount(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .filter(item -> Boolean.FALSE.equals(item.getDeleted()))
                .orElseThrow(() ->
                        new AppException(ErrorCode.TENANT_NOT_FOUND));

        if (tenant.getPhone() == null || tenant.getPhone().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        // Kiểm tra trên toàn bảng để tránh xung đột UNIQUE
        // với tài khoản đã bị xóa mềm.
        if (userRepository.existsByUsernameAndDeletedFalse(tenant.getPhone())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        if (userRepository.existsByTenant_IdAndDeletedFalse(tenantId)) {
            throw new AppException(ErrorCode.TENANT_HAS_ACCOUNT);
        }

        String temporaryPassword = "123456";

        User user = User.builder()
                .username(tenant.getPhone())
                .password(passwordEncoder.encode(temporaryPassword))
                .fullName(tenant.getFullName())
                .role(Role.TENANT)
                .status(UserStatus.ACTIVE)
                .mustChangePassword(true)
                .tenant(tenant)
                .build();
        User savedUser = userRepository.save(user);

        tenant.setUser(savedUser);
        tenantRepository.save(tenant);

        return userMapper.toUserResponse(savedUser);
    }

    // =========================
    // DANH SÁCH TÀI KHOẢN
    // =========================

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAllUsers(
            int page,
            int size,
            String keyword,
            Role role,
            UserStatus status
    ) {

        String normalizedKeyword =
                keyword == null || keyword.isBlank()
                        ? null
                        : keyword.trim();

        PageRequest pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<User> userPage = userRepository.findAllWithFilter(
                normalizedKeyword,
                role,
                status,
                pageable
        );

        List<UserResponse> users = userPage.getContent()
                .stream()
                .map(userMapper::toUserResponse)
                .toList();

        return PageResponse.<UserResponse>builder()
                .items(users)
                .currentPage(userPage.getNumber() + 1)
                .pageSize(userPage.getSize())
                .totalItems(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .build();
    }

    // =========================
    // CHI TIẾT TÀI KHOẢN
    // =========================

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long userId) {
        User user = findActiveUserById(userId);

        return userMapper.toUserResponse(user);
    }

    // =========================
    // CẬP NHẬT TRẠNG THÁI
    // =========================

    @Override
    public UserResponse updateUserStatus(Long userId, UserStatus status) {
        if (status == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        User user = findActiveUserById(userId);

        if (user.getRole() == Role.ADMIN
                && status == UserStatus.INACTIVE) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        user.setStatus(status);

        return userMapper.toUserResponse(userRepository.save(user));
    }

    // =========================
    // ĐẶT LẠI MẬT KHẨU
    // =========================

    @Override
    public String resetPassword(Long userId) {
        User user = findActiveUserById(userId);

        String temporaryPassword = "123456";

        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);

        userRepository.save(user);

        return temporaryPassword;
    }

    // =========================
    // HÀM HỖ TRỢ
    // =========================

    private User findActiveUserById(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> Boolean.FALSE.equals(user.getDeleted()))
                .orElseThrow(() ->
                        new AppException(ErrorCode.USER_NOT_FOUND));
    }

}
