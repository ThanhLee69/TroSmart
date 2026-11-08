package com.project.trosmart.dto.request;

import com.project.trosmart.enums.Role;
import com.project.trosmart.enums.UserStatus;
import jakarta.validation.constraints.Email;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserUpdateRequest {

    private String fullName;

    @Email(message = "Email không hợp lệ")
    private String email;

    private String phoneNumber;

    private String avatarUrl;

    private Role role;

    private UserStatus status;
}
