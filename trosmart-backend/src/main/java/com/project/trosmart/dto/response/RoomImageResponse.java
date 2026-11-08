
package com.project.trosmart.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RoomImageResponse {

    private Long id;

    private String imageUrl;

    private Boolean isThumbnail;
}
