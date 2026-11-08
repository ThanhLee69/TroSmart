package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.RoomRequest;
import com.project.trosmart.dto.response.AmenitySummaryResponse;
import com.project.trosmart.dto.response.RoomDetailResponse;
import com.project.trosmart.dto.response.RoomImageResponse;
import com.project.trosmart.dto.response.RoomOptionResponse;
import com.project.trosmart.dto.response.RoomResponse;
import com.project.trosmart.entity.Amenity;
import com.project.trosmart.entity.Room;
import com.project.trosmart.entity.RoomImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Mapper(componentModel = "spring")
public interface RoomMapper {

    /**
     * Chuyển RoomRequest thành Room.
     * Các quan hệ được xử lý trong Service.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "building", ignore = true)
    @Mapping(target = "amenities", ignore = true)
    @Mapping(target = "images", ignore = true)
    Room toRoom(RoomRequest request);

    /**
     * Cập nhật thông tin phòng từ RoomRequest.
     * Không cập nhật các quan hệ và trường quản lý hệ thống.
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "building", ignore = true)
    @Mapping(target = "amenities", ignore = true)
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateRoom(
            @MappingTarget Room room,
            RoomRequest request
    );

    /**
     * Room -> RoomResponse (dữ liệu gọn cho bảng danh sách).
     */
    @Mapping(
            target = "buildingId",
            expression = "java(room.getBuilding() != null ? room.getBuilding().getId() : null)"
    )
    @Mapping(
            target = "buildingName",
            expression = "java(room.getBuilding() != null ? room.getBuilding().getName() : null)"
    )
    @Mapping(
            target = "thumbnailUrl",
            expression = "java(thumbnailOf(room))"
    )
    RoomResponse toRoomResponse(Room room);

    /**
     * Room -> RoomDetailResponse (đầy đủ cho trang chi tiết).
     * Các trường liên quan (hợp đồng, hóa đơn...) do Service điền thêm.
     */
    @Mapping(
            target = "buildingId",
            expression = "java(room.getBuilding() != null ? room.getBuilding().getId() : null)"
    )
    @Mapping(
            target = "buildingName",
            expression = "java(room.getBuilding() != null ? room.getBuilding().getName() : null)"
    )
    @Mapping(
            target = "amenities",
            expression = "java(mapAmenities(room.getAmenities()))"
    )
    @Mapping(
            target = "images",
            expression = "java(mapImages(room.getImages()))"
    )
    @Mapping(target = "currentContract", ignore = true)
    @Mapping(target = "lastContract", ignore = true)
    @Mapping(target = "currentTenants", ignore = true)
    @Mapping(target = "latestMeterReading", ignore = true)
    @Mapping(target = "recentInvoices", ignore = true)
    @Mapping(target = "unpaidTotal", ignore = true)
    @Mapping(target = "recentIssues", ignore = true)
    RoomDetailResponse toRoomDetailResponse(Room room);

    /**
     * Ảnh đại diện: ưu tiên ảnh isThumbnail, không có thì lấy ảnh đầu.
     */
    default String thumbnailOf(Room room) {
        if (room.getImages() == null || room.getImages().isEmpty()) {
            return null;
        }

        return room.getImages().stream()
                .sorted(Comparator.comparing(
                        (RoomImage image) ->
                                !Boolean.TRUE.equals(image.getIsThumbnail())
                ))
                .map(RoomImage::getImageUrl)
                .findFirst()
                .orElse(null);
    }

    /**
     * Chuyển danh sách tiện ích thành DTO rút gọn.
     */
    default List<AmenitySummaryResponse> mapAmenities(
            Set<Amenity> amenities
    ) {
        if (amenities == null || amenities.isEmpty()) {
            return List.of();
        }

        return amenities.stream()
                .map(amenity -> AmenitySummaryResponse.builder()
                        .id(amenity.getId())
                        .name(amenity.getName())
                        .build())
                .toList();
    }

    /**
     * Chuyển danh sách hình ảnh thành DTO phản hồi.
     */
    default List<RoomImageResponse> mapImages(
            Set<RoomImage> images
    ) {
        if (images == null || images.isEmpty()) {
            return List.of();
        }

        return images.stream()
                .map(image -> RoomImageResponse.builder()
                        .id(image.getId())
                        .imageUrl(image.getImageUrl())
                        .isThumbnail(image.getIsThumbnail())
                        .build())
                .toList();
    }

    @Mapping(
            target = "buildingName",
            expression = "java(room.getBuilding() != null ? room.getBuilding().getName() : null)"
    )
    @Mapping(target = "rentalPrice", source = "rentalPrice")
    RoomOptionResponse toRoomOptionResponse(Room room);

    List<RoomOptionResponse> toRoomOptionResponses(List<Room> rooms);
}