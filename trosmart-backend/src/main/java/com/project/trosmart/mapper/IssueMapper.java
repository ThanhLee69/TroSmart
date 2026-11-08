package com.project.trosmart.mapper;

import com.project.trosmart.dto.request.IssueRequest;
import com.project.trosmart.dto.response.IssueResponse;
import com.project.trosmart.entity.Issue;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface IssueMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "room", ignore = true)
    @Mapping(target = "tenant", ignore = true)
    @Mapping(target = "status", ignore = true)
    Issue toEntity(IssueRequest request);


    @Mapping(target = "roomNumber", source = "room.roomNumber")
    @Mapping(target = "buildingName", source = "room.building.name")
    @Mapping(target = "tenantName", source = "tenant.fullName")
    IssueResponse toResponse(Issue issue);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "room", ignore = true)
    @Mapping(target = "tenant", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    void updateEntity(
            @MappingTarget Issue issue,
            IssueRequest request
    );
}