package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.UserCreateRequest;
import com.project.trosmart.dto.request.UserUpdateRequest;
import com.project.trosmart.dto.response.UserResponse;
import com.project.trosmart.entity.User;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "fullName", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "mustChangePassword", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "tenant", ignore = true)
    User toUser(UserCreateRequest request);

    @BeanMapping(
            nullValuePropertyMappingStrategy =
                    NullValuePropertyMappingStrategy.IGNORE
    )
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "password", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "mustChangePassword", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "tenant", ignore = true)
    void updateUserFromRequest(
            UserUpdateRequest request,
            @MappingTarget User user
    );

    UserResponse toUserResponse(User user);
}