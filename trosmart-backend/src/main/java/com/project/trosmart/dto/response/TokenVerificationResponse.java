package com.project.trosmart.dto.response;

import lombok.*;

import java.util.Date;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TokenVerificationResponse {

    private boolean valid;
    private String username;
    private String scope;
    private Date expiryTime;
}
