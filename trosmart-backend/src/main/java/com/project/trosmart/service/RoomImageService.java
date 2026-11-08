
package com.project.trosmart.service;

import com.project.trosmart.dto.response.RoomImageResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface RoomImageService {

    List<RoomImageResponse> getRoomImages(Long roomId);

    List<RoomImageResponse> uploadImages(
            Long roomId,
            List<MultipartFile> files
    );

    RoomImageResponse setThumbnail(Long roomId, Long imageId);

    void deleteImage(Long roomId, Long imageId);
}
