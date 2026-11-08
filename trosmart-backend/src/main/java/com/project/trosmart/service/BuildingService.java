
package com.project.trosmart.service;

import com.project.trosmart.dto.request.BuildingRequest;
import com.project.trosmart.dto.response.BuildingOptionResponse;
import com.project.trosmart.dto.response.BuildingResponse;
import com.project.trosmart.dto.response.PageResponse;

import java.util.List;

public interface BuildingService {

    BuildingResponse createBuilding(BuildingRequest request);

    PageResponse<BuildingResponse> getBuildings(
            String keyword,
            int page,
            int size
    );

    BuildingResponse getBuildingById(Long id);

    BuildingResponse updateBuilding(
            Long id,
            BuildingRequest request
    );

    void deleteBuilding(Long id);


    List<BuildingResponse> getAllBuildings();

    List<BuildingOptionResponse> getBuildingOptions();
}
