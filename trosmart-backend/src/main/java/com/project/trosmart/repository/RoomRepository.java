
package com.project.trosmart.repository;

import com.project.trosmart.dto.response.RoomOptionResponse;
import com.project.trosmart.entity.Room;
import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.RoomType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository
        extends JpaRepository<Room, Long>, JpaSpecificationExecutor<Room> {

    /**
     * Danh sách phòng có phân trang và bộ lọc.
     * Phục vụ trang quản lý phòng trong hệ thống.
     */
    @Query(
            value = """
            SELECT r
            FROM Room r
            JOIN FETCH r.building b
            WHERE r.deleted = false
              AND (
                    :keyword IS NULL
                    OR TRIM(:keyword) = ''
                    OR LOWER(r.roomNumber) LIKE
                        CONCAT('%', LOWER(:keyword), '%')
                    OR LOWER(COALESCE(r.description, '')) LIKE
                        CONCAT('%', LOWER(:keyword), '%')
                  )
              AND (:buildingId IS NULL OR b.id = :buildingId)
              AND (:roomType IS NULL OR r.roomType = :roomType)
              AND (:status IS NULL OR r.status = :status)
            ORDER BY r.id DESC
            """,
            countQuery = """
            SELECT COUNT(r)
            FROM Room r
            WHERE r.deleted = false
              AND (
                    :keyword IS NULL
                    OR TRIM(:keyword) = ''
                    OR LOWER(r.roomNumber) LIKE
                        CONCAT('%', LOWER(:keyword), '%')
                    OR LOWER(COALESCE(r.description, '')) LIKE
                        CONCAT('%', LOWER(:keyword), '%')
                  )
              AND (:buildingId IS NULL OR r.building.id = :buildingId)
              AND (:roomType IS NULL OR r.roomType = :roomType)
              AND (:status IS NULL OR r.status = :status)
            """
    )
    Page<Room> searchRooms(
            @Param("keyword") String keyword,
            @Param("buildingId") Long buildingId,
            @Param("roomType") RoomType roomType,
            @Param("status") RoomStatus status,
            Pageable pageable
    );

    /**
     * Chi tiết phòng, không lấy phòng đã xóa mềm.
     */
    @Query("""
        SELECT r
        FROM Room r
        JOIN FETCH r.building
        WHERE r.id = :id
          AND r.deleted = false
        """)
    Optional<Room> findActiveRoomById(@Param("id") Long id);

    /**
     * Danh sách phòng thuộc một tòa nhà.
     */
    List<Room> findAllByBuilding_IdAndDeletedFalse(Long buildingId);

    /**
     * Kiểm tra số phòng đã tồn tại trong cùng tòa nhà.
     */
    boolean existsByBuilding_IdAndRoomNumberIgnoreCaseAndDeletedFalse(
            Long buildingId,
            String roomNumber
    );

    /**
     * Kiểm tra trùng số phòng khi cập nhật,
     * bỏ qua phòng hiện tại.
     */
    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
        FROM Room r
        WHERE r.building.id = :buildingId
          AND LOWER(r.roomNumber) = LOWER(:roomNumber)
          AND r.id <> :roomId
          AND r.deleted = false
        """)
    boolean existsDuplicateRoomNumber(
            @Param("buildingId") Long buildingId,
            @Param("roomNumber") String roomNumber,
            @Param("roomId") Long roomId
    );

    /**
     * Tổng số phòng đang được quản lý.
     */
    long countByDeletedFalse();

    /**
     * Số phòng của một tòa nhà.
     */
    long countByBuilding_IdAndDeletedFalse(Long buildingId);

    /**
     * Thống kê phòng theo trạng thái.
     */
    long countByStatusAndDeletedFalse(RoomStatus status);

    /**
     * Thống kê phòng theo trạng thái trong một tòa nhà.
     */
    long countByBuilding_IdAndStatusAndDeletedFalse(
            Long buildingId,
            RoomStatus status
    );

    @Query("""
    SELECT r
    FROM Room r
    JOIN FETCH r.building b
    WHERE r.deleted = false
      AND b.deleted = false
      AND r.status = com.project.trosmart.enums.RoomStatus.AVAILABLE
      AND (
          :keyword IS NULL
          OR TRIM(:keyword) = ''
          OR LOWER(r.roomNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
      )
    ORDER BY b.name ASC, r.roomNumber ASC
    """)
    List<Room> findRoomOptions(@Param("keyword") String keyword);


    @Query("""
        SELECT r
        FROM Room r
        JOIN FETCH r.building b
        WHERE r.deleted = false
          AND r.status = com.project.trosmart.enums.RoomStatus.OCCUPIED
          AND (LOWER(r.roomNumber) LIKE :keyword ESCAPE '\\'
               OR LOWER(b.name) LIKE :keyword ESCAPE '\\')
        ORDER BY b.name ASC, r.roomNumber ASC
        """)
    List<Room> findOccupiedRoomOptions(
            @Param("keyword") String keyword,
            Pageable pageable
    );







/**
        * Phòng còn trống cho khách xem (trang public).
            * Bỏ qua phòng và tòa nhà đã xóa mềm.
     */
    @Query(
            value = """
            SELECT r
            FROM Room r
            JOIN FETCH r.building b
            WHERE r.deleted = false
              AND b.deleted = false
              AND r.status = com.project.trosmart.enums.RoomStatus.AVAILABLE
            ORDER BY r.id DESC
            """,
            countQuery = """
            SELECT COUNT(r)
            FROM Room r
            WHERE r.deleted = false
              AND r.building.deleted = false
              AND r.status = com.project.trosmart.enums.RoomStatus.AVAILABLE
            """
    )
    Page<Room> findAvailableRooms(Pageable pageable);
    // Chỉ lấy phòng đang trống và chưa xóa. Sửa điều kiện status cho giống
// query findAvailableRooms hiện có của bạn (đang đoán là RoomStatus.AVAILABLE).
    @Query("""
        SELECT r FROM Room r
        JOIN FETCH r.building
        WHERE r.id = :id
          AND r.deleted = false
          AND r.status = com.project.trosmart.enums.RoomStatus.AVAILABLE
        """)
    Optional<Room> findAvailableRoomById(@Param("id") Long id);


    /**
     * Ứng viên cho "Phòng tương tự": phòng còn trống, khác phòng đang xem,
     * giá trong khoảng [minPrice, maxPrice]. Việc chấm điểm làm ở service.
     */
    @Query("""
        SELECT r
        FROM Room r
        JOIN FETCH r.building b
        WHERE r.deleted = false
          AND b.deleted = false
          AND r.status = com.project.trosmart.enums.RoomStatus.AVAILABLE
          AND r.id <> :excludeId
          AND r.rentalPrice BETWEEN :minPrice AND :maxPrice
        ORDER BY r.id DESC
        """)
    List<Room> findSimilarCandidates(
            @Param("excludeId") Long excludeId,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            Pageable pageable
    );

    /**
     * Nạp tiện nghi của nhiều phòng bằng 1 query (tránh N+1).
     * Không phân trang nên dùng JOIN FETCH được.
     */
    @Query("""
        SELECT DISTINCT r
        FROM Room r
        LEFT JOIN FETCH r.amenities
        WHERE r.id IN :ids
        """)
    List<Room> findAllWithAmenitiesByIdIn(@Param("ids") Collection<Long> ids);


}
