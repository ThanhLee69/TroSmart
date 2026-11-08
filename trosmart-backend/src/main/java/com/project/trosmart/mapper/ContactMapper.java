package com.project.trosmart.mapper;

import com.project.trosmart.dto.response.ContactResponse;
import com.project.trosmart.entity.ContactMessage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ContactMapper {

    // MapStruct tự bỏ qua nếu room null
    @Mapping(target = "roomId", source = "room.id")
    @Mapping(target = "roomNumber", source = "room.roomNumber")
    @Mapping(target = "buildingName", source = "room.building.name")
    @Mapping(target = "sentAt", source = "createdAt")
    ContactResponse toResponse(ContactMessage contact);
}
