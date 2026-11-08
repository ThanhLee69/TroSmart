package com.project.trosmart.mapper;

import com.project.trosmart.dto.response.NotificationDetailResponse;
import com.project.trosmart.dto.response.NotificationRecipientResponse;
import com.project.trosmart.dto.response.NotificationResponse;
import com.project.trosmart.entity.Notification;
import com.project.trosmart.entity.NotificationRecipient;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    // targetName, recipientCount, readCount do service điền
    NotificationResponse toNotificationResponse(Notification notification);

    @Mapping(target = "buildingId", source = "building.id")
    @Mapping(target = "buildingName", source = "building.name")
    @Mapping(target = "roomId", source = "room.id")
    @Mapping(target = "roomNumber", source = "room.roomNumber")
    @Mapping(target = "tenantId", source = "tenant.id")
    @Mapping(target = "tenantName", source = "tenant.fullName")
    NotificationDetailResponse toNotificationDetailResponse(Notification notification);

    @Mapping(target = "tenantId", source = "tenant.id")
    @Mapping(target = "tenantName", source = "tenant.fullName")
    @Mapping(target = "tenantPhone", source = "tenant.phone")
    NotificationRecipientResponse toRecipientResponse(NotificationRecipient recipient);
}
