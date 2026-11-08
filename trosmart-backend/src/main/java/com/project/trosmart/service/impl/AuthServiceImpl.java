
package com.project.trosmart.service.impl;

import com.nimbusds.jwt.SignedJWT;
import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.*;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.entity.InvalidatedToken;
import com.project.trosmart.entity.User;
import com.project.trosmart.enums.UserStatus;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.UserMapper;
import com.project.trosmart.repository.InvalidatedTokenRepository;
import com.project.trosmart.repository.UserRepository;
import com.project.trosmart.security.JwtService;
import com.project.trosmart.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.text.ParseException;
import java.time.LocalDateTime;
import java.util.Date;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    public AuthResponse login(LoginRequest request) {

        User user = userRepository
                .findByUsernameAndDeletedFalse(request.getUsername())
                .orElseThrow(() ->
                        new AppException(ErrorCode.UNAUTHENTICATED));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.USER_LOCKED);
        }

        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPassword())) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpiration())
                .userInfo(userMapper.toUserResponse(user))
                .build();
    }


    @Override
    public void logout(LogoutRequest request) {

        TokenVerificationResponse verification =
                jwtService.verifyToken(request.getToken());

        if (!verification.isValid()) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }

        try {
            SignedJWT signedJWT =
                    SignedJWT.parse(request.getToken());

            String jwtId = signedJWT.getJWTClaimsSet().getJWTID();

            Date expirationTime =
                    signedJWT.getJWTClaimsSet().getExpirationTime();

            if (jwtId == null || expirationTime == null) {
                throw new AppException(ErrorCode.TOKEN_INVALID);
            }

            // Token đã bị vô hiệu hóa thì không cần xử lý lại
            if (invalidatedTokenRepository.existsById(jwtId)) {
                return;
            }

            long ttlSeconds =
                    (expirationTime.getTime() - System.currentTimeMillis())
                            / 1000;

            if (ttlSeconds <= 0) {
                return;
            }

            invalidatedTokenRepository.save(
                    InvalidatedToken.builder()
                            .jwtId(jwtId)
                            .expiryTime(ttlSeconds)
                            .build()
            );

        } catch (ParseException e) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
    }



    @Override
    public RefreshTokenResponse refreshToken(RefreshTokenRequest request) {

        // Xác minh refresh token
        TokenVerificationResponse verification =
                jwtService.verifyToken(request.getRefreshToken());

        if (!Boolean.TRUE.equals(verification.isValid())) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }

        try {
            SignedJWT signedJWT =
                    SignedJWT.parse(request.getRefreshToken());

            String jwtId = signedJWT.getJWTClaimsSet().getJWTID();

            if (jwtId == null) {
                throw new AppException(ErrorCode.TOKEN_INVALID);
            }

            // Kiểm tra refresh token đã bị thu hồi chưa
            if (invalidatedTokenRepository.existsById(jwtId)) {
                throw new AppException(ErrorCode.TOKEN_REUSED);
            }

            // Tìm tài khoản theo username trong token
            String username = verification.getUsername();

            User user = userRepository
                    .findByUsernameAndDeletedFalse(username)
                    .orElseThrow(() ->
                            new AppException(ErrorCode.UNAUTHENTICATED));

            if (user.getStatus() != UserStatus.ACTIVE) {
                throw new AppException(ErrorCode.USER_LOCKED);
            }

            long ttlSeconds =
                    (verification.getExpiryTime().getTime()
                            - System.currentTimeMillis()) / 1000;

            if (ttlSeconds <= 0) {
                throw new AppException(ErrorCode.TOKEN_EXPIRED);
            }

            // Vô hiệu hóa refresh token cũ
            invalidatedTokenRepository.save(
                    InvalidatedToken.builder()
                            .jwtId(jwtId)
                            .expiryTime(ttlSeconds)
                            .build()
            );

            // Cấp cặp token mới
            String newAccessToken = jwtService.generateAccessToken(user);
            String newRefreshToken = jwtService.generateRefreshToken(user);

            return RefreshTokenResponse.builder()
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .tokenType("Bearer")
                    .expiresIn(jwtService.getAccessTokenExpiration())
                    .build();

        } catch (ParseException e) {
            throw new AppException(ErrorCode.TOKEN_INVALID);
        }
    }


    @Override
    public IntrospectResponse introspect(IntrospectRequest request) {

        TokenVerificationResponse verification =
                jwtService.verifyToken(request.getToken());

        boolean valid = false;

        if (Boolean.TRUE.equals(verification.isValid())) {

            String username = verification.getUsername();

            User user = userRepository
                    .findByUsernameAndDeletedFalse(username)
                    .orElse(null);

            if (user != null
                    && user.getStatus() == UserStatus.ACTIVE) {

                try {
                    SignedJWT signedJWT =
                            SignedJWT.parse(request.getToken());

                    String jwtId =
                            signedJWT.getJWTClaimsSet().getJWTID();

                    valid = jwtId != null
                            && !invalidatedTokenRepository.existsById(jwtId);

                } catch (ParseException e) {
                    valid = false;
                }
            }
        }

        return IntrospectResponse.builder()
                .valid(valid)
                .build();
    }

}
