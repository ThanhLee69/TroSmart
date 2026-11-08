package com.project.trosmart.repository;

import com.project.trosmart.entity.MeterReading;
import com.project.trosmart.enums.MeterReadingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface MeterReadingRepository extends JpaRepository<MeterReading, Long> {

    Optional<MeterReading>
    findFirstByRoom_IdAndStatusNotAndDeletedFalseOrderByBillingYearDescBillingMonthDesc(
            Long roomId,
            MeterReadingStatus status
    );

    // =========================================================
    // getMeterReadingById / updateMeterReading / deleteMeterReading
    // Lấy 1 bản ghi còn hoạt động (bản ghi, phòng, tòa nhà đều chưa bị xóa)
    // Fetch luôn phòng + tòa nhà để mapper đọc được room.building.name
    // =========================================================
    @Query("""
        SELECT m
        FROM MeterReading m
        JOIN FETCH m.room r
        JOIN FETCH r.building b
        WHERE m.id = :id
          AND m.deleted = false
          AND r.deleted = false
          AND b.deleted = false
        """)
    Optional<MeterReading> findActiveById(@Param("id") Long id);

    // =========================================================
    // createMeterReading
    // Phòng đã có bản ghi trong kỳ này chưa
    // =========================================================
    boolean existsByRoom_IdAndBillingMonthAndBillingYearAndDeletedFalse(
            Long roomId,
            Integer billingMonth,
            Integer billingYear
    );

    // =========================================================
    // createMeterReading
    // Lấy bản ghi đã chốt gần nhất TRƯỚC kỳ đang ghi,
    // để tự điền chỉ số đầu kỳ = chỉ số cuối kỳ trước.
    // Gọi với PageRequest.of(0, 1) rồi lấy phần tử đầu.
    // =========================================================
    @Query("""
        SELECT m
        FROM MeterReading m
        WHERE m.room.id = :roomId
          AND m.deleted = false
          AND m.status <> com.project.trosmart.enums.MeterReadingStatus.NOT_RECORDED
          AND (m.billingYear < :billingYear
               OR (m.billingYear = :billingYear AND m.billingMonth < :billingMonth))
        ORDER BY m.billingYear DESC, m.billingMonth DESC
        """)
    List<MeterReading> findPreviousReadings(
            @Param("roomId") Long roomId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear,
            Pageable pageable
    );

    // =========================================================
    // getMeterReadings
    // Lấy TẤT CẢ phòng, ghép với bản ghi của kỳ đó
    //   - phòng đã có bản ghi  -> m có dữ liệu
    //   - phòng chưa có bản ghi -> m = null (coi như NOT_RECORDED)
    // Mỗi dòng trả về là [Room, MeterReading]
    // =========================================================
    @Query(
            value = """
        SELECT r, m
        FROM Room r
        JOIN FETCH r.building b
        LEFT JOIN MeterReading m
            ON m.room = r
            AND m.deleted = false
            AND m.billingMonth = :billingMonth
            AND m.billingYear = :billingYear
        WHERE r.deleted = false
          AND r.status = com.project.trosmart.enums.RoomStatus.OCCUPIED
          AND b.deleted = false
          AND (:buildingId IS NULL OR b.id = :buildingId)
          AND LOWER(r.roomNumber) LIKE :keyword ESCAPE '\\'
          AND (
              :status IS NULL
              OR m.status = :status
              OR (
                  m.id IS NULL
                  AND :status = com.project.trosmart.enums.MeterReadingStatus.NOT_RECORDED
              )
          )
        ORDER BY b.name ASC, r.roomNumber ASC
        """,
            countQuery = """
        SELECT COUNT(r)
        FROM Room r
        JOIN r.building b
        LEFT JOIN MeterReading m
            ON m.room = r
            AND m.deleted = false
            AND m.billingMonth = :billingMonth
            AND m.billingYear = :billingYear
        WHERE r.deleted = false
          AND r.status = com.project.trosmart.enums.RoomStatus.OCCUPIED
          AND b.deleted = false
          AND (:buildingId IS NULL OR b.id = :buildingId)
          AND LOWER(r.roomNumber) LIKE :keyword ESCAPE '\\'
          AND (
              :status IS NULL
              OR m.status = :status
              OR (
                  m.id IS NULL
                  AND :status = com.project.trosmart.enums.MeterReadingStatus.NOT_RECORDED
              )
          )
        """
    )
    Page<Object[]> findMeterReadingRooms(
            @Param("buildingId") Long buildingId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear,
            @Param("status") MeterReadingStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    // =========================================================
    // getMeterReadingHistory
    // Lịch sử của 1 phòng, mới nhất trước. Tháng/năm là bộ lọc tùy chọn.
    // =========================================================
    @Query(
            value = """
        SELECT m
        FROM MeterReading m
        JOIN FETCH m.room r
        JOIN FETCH r.building b
        WHERE r.id = :roomId
          AND m.deleted = false
          AND r.deleted = false
          AND b.deleted = false
          AND (:billingMonth IS NULL OR m.billingMonth = :billingMonth)
          AND (:billingYear IS NULL OR m.billingYear = :billingYear)
        ORDER BY m.billingYear DESC, m.billingMonth DESC, m.id DESC
        """,
            countQuery = """
        SELECT COUNT(m)
        FROM MeterReading m
        JOIN m.room r
        JOIN r.building b
        WHERE r.id = :roomId
          AND m.deleted = false
          AND r.deleted = false
          AND b.deleted = false
          AND (:billingMonth IS NULL OR m.billingMonth = :billingMonth)
          AND (:billingYear IS NULL OR m.billingYear = :billingYear)
        """
    )
    Page<MeterReading> findMeterReadingHistory(
            @Param("roomId") Long roomId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear,
            Pageable pageable
    );

    // =========================================================
    // getMeterReadingDashboard
    // statuses = RECORDED, INVOICED
    // =========================================================

    // Tổng điện tiêu thụ (kWh); trả null nếu chưa có bản ghi nào
    @Query("""
        SELECT SUM(m.electricityEnd - m.electricityStart)
        FROM MeterReading m
        WHERE m.deleted = false
          AND m.room.deleted = false
          AND m.room.status = com.project.trosmart.enums.RoomStatus.OCCUPIED
          AND m.room.building.deleted = false
          AND (:buildingId IS NULL OR m.room.building.id = :buildingId)
          AND m.billingMonth = :billingMonth
          AND m.billingYear = :billingYear
          AND m.status IN :statuses
        """)
    BigDecimal sumElectricityConsumption(
            @Param("buildingId") Long buildingId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear,
            @Param("statuses") List<MeterReadingStatus> statuses
    );

    // Tổng nước tiêu thụ (m3) của các phòng đang thuê; trả null nếu chưa có bản ghi nào
    @Query("""
    SELECT SUM(m.waterEnd - m.waterStart)
    FROM MeterReading m
    WHERE m.deleted = false
      AND m.room.deleted = false
      AND m.room.status = com.project.trosmart.enums.RoomStatus.OCCUPIED
      AND m.room.building.deleted = false
      AND (:buildingId IS NULL OR m.room.building.id = :buildingId)
      AND m.billingMonth = :billingMonth
      AND m.billingYear = :billingYear
      AND m.status IN :statuses
    """)
    BigDecimal sumWaterConsumption(
            @Param("buildingId") Long buildingId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear,
            @Param("statuses") List<MeterReadingStatus> statuses
    );

    // Số phòng đang thuê đã ghi chỉ số
    @Query("""
    SELECT COUNT(m)
    FROM MeterReading m
    WHERE m.deleted = false
      AND m.room.deleted = false
      AND m.room.status = com.project.trosmart.enums.RoomStatus.OCCUPIED
      AND m.room.building.deleted = false
      AND (:buildingId IS NULL OR m.room.building.id = :buildingId)
      AND m.billingMonth = :billingMonth
      AND m.billingYear = :billingYear
      AND m.status IN :statuses
    """)
    long countRecordedRooms(
            @Param("buildingId") Long buildingId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear,
            @Param("statuses") List<MeterReadingStatus> statuses
    );

    // Số phòng đang thuê chưa ghi: chưa có bản ghi trong kỳ, hoặc bản ghi còn NOT_RECORDED
    @Query("""
    SELECT COUNT(r)
    FROM Room r
    JOIN r.building b
    LEFT JOIN MeterReading m
        ON m.room = r
        AND m.deleted = false
        AND m.billingMonth = :billingMonth
        AND m.billingYear = :billingYear
    WHERE r.deleted = false
      AND r.status = com.project.trosmart.enums.RoomStatus.OCCUPIED
      AND b.deleted = false
      AND (:buildingId IS NULL OR b.id = :buildingId)
      AND (m.id IS NULL
           OR m.status = com.project.trosmart.enums.MeterReadingStatus.NOT_RECORDED)
    """)
    long countUnrecordedRooms(
            @Param("buildingId") Long buildingId,
            @Param("billingMonth") Integer billingMonth,
            @Param("billingYear") Integer billingYear
    );

    Optional<MeterReading> findByRoom_IdAndBillingMonthAndBillingYearAndDeletedFalse(
            Long roomId,
            Integer billingMonth,
            Integer billingYear
    );

    @Query("""
    SELECT m FROM MeterReading m
    WHERE m.contract.id = :contractId
      AND m.deleted = false
      AND m.electricityEnd IS NOT NULL
      AND m.waterEnd IS NOT NULL
      AND (m.billingYear < :year
           OR (m.billingYear = :year AND m.billingMonth < :month))
    ORDER BY m.billingYear DESC, m.billingMonth DESC
    LIMIT 1
    """)
    Optional<MeterReading> findPreviousInContract(
            @Param("contractId") Long contractId,
            @Param("month") Integer month,
            @Param("year") Integer year);
}