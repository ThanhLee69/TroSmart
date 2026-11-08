
package com.project.trosmart.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class RoomOptionResponse {

    private Long id;

    private String roomNumber;

    private String buildingName;

    private BigDecimal rentalPrice;

}