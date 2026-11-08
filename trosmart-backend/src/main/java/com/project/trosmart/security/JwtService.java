package com.project.trosmart.security;

import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.response.TokenVerificationResponse;
import com.project.trosmart.entity.User;
import com.project.trosmart.exception.AppException;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtService {


    @Value("${jwt.signerKey}")
    private String signerKey;

    @Getter
    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;



    public  String generateAccessToken(User user){
        return generateToken(user, accessTokenExpiration);
    }

    public  String generateRefreshToken(User user)  {
        return generateToken(user, refreshTokenExpiration);
    }

    private String generateToken(User user, long duration) {
        try {
            JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);

            JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                    .subject(user.getUsername())
                    .issuer("room-management-system")
                    .issueTime(new Date())
                    .expirationTime(new Date(Instant.now().plus(duration, ChronoUnit.SECONDS).toEpochMilli()))
                    .jwtID(UUID.randomUUID().toString())
                    .claim("authorities",
//                            buildAuthorities(user)
                            user.getRole().toString()
                    )
                    .build();

            Payload payload = new Payload(jwtClaimsSet.toJSONObject());

            JWSObject jwsObject = new JWSObject(header, payload);

            jwsObject.sign(new MACSigner(signerKey.getBytes()));
            return jwsObject.serialize();

        } catch (JOSEException e) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
    }

    public TokenVerificationResponse verifyToken(String token) {

        try {
            SignedJWT signedJWT = SignedJWT.parse(token);

            JWSVerifier verifier = new MACVerifier(signerKey.getBytes());

            if (!signedJWT.verify(verifier)) {
                return TokenVerificationResponse.builder()
                        .valid(false)
                        .build();
            }

            Date expirationTime = signedJWT.getJWTClaimsSet().getExpirationTime();
            if(expirationTime.before(new Date())) {
                return TokenVerificationResponse.builder()
                        .valid(false)
                        .build();
            }

            return TokenVerificationResponse.builder()
                    .valid(true)
                    .username(signedJWT.getJWTClaimsSet().getSubject())
                    .scope(signedJWT.getJWTClaimsSet().getStringClaim("authorities"))
                    .expiryTime(expirationTime)
                    .build();

        } catch (Exception e) {
            return TokenVerificationResponse.builder()
                    .valid(false)
                    .build();
        }
    }


//    private String buildAuthorities(User user) {
//        StringJoiner joiner = new StringJoiner(" ");
//
//        if (user.getRoles() != null) {
//            user.getRoles().forEach(role -> {
//                joiner.add("ROLE_" + role.getCode());
//
//                if (role.getPermissions() != null) {
//                    role.getPermissions().forEach(permission ->
//                            joiner.add(permission.getCode())
//                    );
//                }
//            });
//        }
//
//        return joiner.toString();
//    }

}
