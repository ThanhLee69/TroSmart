package com.project.trosmart.repository;

import com.project.trosmart.entity.RoomImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomImageRepository
        extends JpaRepository<RoomImage, Long> {

    // Lấy ảnh của phòng, ảnh đại diện hiển thị trước.
    List<RoomImage> findByRoom_IdOrderByIsThumbnailDescIdAsc(
            Long roomId
    );

    // Tìm ảnh thuộc đúng phòng trước khi xóa hoặc chỉnh sửa.
    Optional<RoomImage> findByIdAndRoom_Id(
            Long imageId,
            Long roomId
    );

    // Lấy ảnh đại diện hiện tại của phòng.
    Optional<RoomImage> findByRoom_IdAndIsThumbnailTrue(
            Long roomId
    );

    // Đếm ảnh để kiểm soát giới hạn upload nếu cần.
    long countByRoom_Id(Long roomId);


    @Query("""
        SELECT i
        FROM RoomImage i
        WHERE i.room.id IN :roomIds
          AND i.isThumbnail = true
          AND i.deleted = false
        ORDER BY i.id ASC
        """)
    List<RoomImage> findThumbnailsByRoomIds(@Param("roomIds") List<Long> roomIds);


    @Query("""
        SELECT i FROM RoomImage i
        WHERE i.room.id = :roomId AND i.deleted = false
        ORDER BY i.isThumbnail DESC, i.id ASC
        """)
    List<RoomImage> findByRoomIdOrdered(@Param("roomId") Long roomId);
}