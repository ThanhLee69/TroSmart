
package com.project.trosmart.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BuildingResponse {

    private Long id;

    private String name;

    private String address;

    private String description;

    private String province;

    private String ward;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private List<AmenitySummaryResponse> amenities;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
