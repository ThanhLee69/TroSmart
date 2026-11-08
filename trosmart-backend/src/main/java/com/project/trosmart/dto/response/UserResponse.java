package com.project.trosmart.dto.response;

import com.project.trosmart.enums.Role;
import com.project.trosmart.enums.UserStatus;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class UserResponse {

    private Long id;

    private String username;

    private String fullName;

    private Role role;

    private UserStatus status;

    private Boolean mustChangePassword;

    private LocalDateTime lastLoginAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}