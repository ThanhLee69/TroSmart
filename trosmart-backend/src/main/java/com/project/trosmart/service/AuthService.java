package com.project.trosmart.service;

import com.project.trosmart.dto.request.*;
import com.project.trosmart.dto.response.*;

public interface AuthService {

    AuthResponse login(LoginRequest request);

    void logout(LogoutRequest request);

    RefreshTokenResponse refreshToken(RefreshTokenRequest request);

    IntrospectResponse introspect(IntrospectRequest request);
}