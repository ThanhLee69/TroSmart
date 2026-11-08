
package com.project.trosmart.mapper;

import com.project.trosmart.dto.response.RoomImageResponse;
import com.project.trosmart.entity.RoomImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;
import java.util.Set;

@Mapper(componentModel = "spring")
public interface RoomImageMapper {

    /**
     * Chuyển RoomImage thành RoomImageResponse.
     */
    @Mapping(target = "id", source = "id")
    @Mapping(target = "imageUrl", source = "imageUrl")
    @Mapping(target = "isThumbnail", source = "isThumbnail")
    RoomImageResponse toRoomImageResponse(RoomImage image);

    /**
     * Chuyển danh sách ảnh dạng List.
     */
    List<RoomImageResponse> toResponseList(List<RoomImage> images);

    /**
     * Chuyển tập hợp ảnh dạng Set.
     */
    List<RoomImageResponse> toResponseList(Set<RoomImage> images);
}
