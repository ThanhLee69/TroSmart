package com.project.trosmart.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// Một lựa chọn trong ô chọn đối tượng nhận (tòa nhà / phòng / khách thuê)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationTargetOptionResponse {
    private Long value;
    private String label;
    // Dòng phụ (tên tòa của phòng, số điện thoại của khách)
    private String description;
}
