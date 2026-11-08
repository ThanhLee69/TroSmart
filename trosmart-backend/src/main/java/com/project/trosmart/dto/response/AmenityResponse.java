
package com.project.trosmart.dto.response;

import com.project.trosmart.enums.AmenityScope;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmenityResponse {

    private Long id;

    private String name;

    private String description;

    private AmenityScope scope;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
