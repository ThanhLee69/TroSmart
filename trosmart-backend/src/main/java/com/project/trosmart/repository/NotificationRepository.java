package com.project.trosmart.repository;

import com.project.trosmart.entity.Notification;
import com.project.trosmart.entity.Tenant;
import com.project.trosmart.enums.NotificationStatus;
import com.project.trosmart.enums.NotificationTargetType;
import com.project.trosmart.enums.NotificationType;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Danh sách cho admin. keyword đã được làm sạch (lowercase, escape) và bọc %...% ở service
    @Query(
            value = """
        SELECT n
        FROM Notification n
        LEFT JOIN FETCH n.building
        LEFT JOIN FETCH n.room r
        LEFT JOIN FETCH r.building
        LEFT JOIN FETCH n.tenant
        WHERE n.deleted = false
          AND (:type IS NULL OR n.type = :type)
          AND (:status IS NULL OR n.status = :status)
          AND (:targetType IS NULL OR n.targetType = :targetType)
          AND LOWER(n.title) LIKE :keyword ESCAPE '\\'
        ORDER BY n.createdAt DESC, n.id DESC
        """,
            countQuery = """
        SELECT COUNT(n)
        FROM Notification n
        WHERE n.deleted = false
          AND (:type IS NULL OR n.type = :type)
          AND (:status IS NULL OR n.status = :status)
          AND (:targetType IS NULL OR n.targetType = :targetType)
          AND LOWER(n.title) LIKE :keyword ESCAPE '\\'
        """
    )
    Page<Notification> searchNotifications(
            @Param("type") NotificationType type,
            @Param("status") NotificationStatus status,
            @Param("targetType") NotificationTargetType targetType,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
        SELECT n
        FROM Notification n
        LEFT JOIN FETCH n.building
        LEFT JOIN FETCH n.room r
        LEFT JOIN FETCH r.building
        LEFT JOIN FETCH n.tenant
        WHERE n.id = :id
          AND n.deleted = false
        """)
    Optional<Notification> findActiveById(@Param("id") Long id);

    // Khóa dòng để hai lần gửi / hủy / sửa đồng thời không đè nhau
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT n
        FROM Notification n
        WHERE n.id = :id
          AND n.deleted = false
        """)
    Optional<Notification> findByIdForUpdate(@Param("id") Long id);

    boolean existsByIdAndDeletedFalse(Long id);

    // Thông báo đã hẹn giờ và đến lúc gửi
    @Query("""
        SELECT n.id
        FROM Notification n
        WHERE n.deleted = false
          AND n.status = com.project.trosmart.enums.NotificationStatus.SCHEDULED
          AND n.scheduledAt <= :now
        ORDER BY n.scheduledAt ASC, n.id ASC
        """)
    List<Long> findDueScheduledIds(@Param("now") LocalDateTime now);


    // Khách đang ở (hợp đồng ACTIVE, chưa dọn ra) và đã có tài khoản, theo tòa nhà / phòng.
// Truyền null cho cả hai = tất cả khách đang thuê
    @Query("""
    SELECT DISTINCT t
    FROM ContractTenant ct
    JOIN ct.tenant t
    JOIN ct.contract c
    JOIN c.room r
    WHERE ct.deleted = false
      AND t.deleted = false
      AND t.user IS NOT NULL
      AND c.deleted = false
      AND c.status = com.project.trosmart.enums.ContractStatus.ACTIVE
      AND ct.moveInDate <= :today
      AND (ct.moveOutDate IS NULL OR ct.moveOutDate >= :today)
      AND (:buildingId IS NULL OR r.building.id = :buildingId)
      AND (:roomId IS NULL OR r.id = :roomId)
    """)
    List<Tenant> findResidingTenants(
            @Param("buildingId") Long buildingId,
            @Param("roomId") Long roomId,
            @Param("today") LocalDate today
    );


    @Query("""
        SELECT n.status, COUNT(n)
        FROM Notification n
        WHERE n.deleted = false
        GROUP BY n.status
        """)
    List<Object[]> countGroupByStatus();

    // Thời điểm hẹn gần nhất trong số thông báo đang chờ gửi
    @Query("""
        SELECT MIN(n.scheduledAt)
        FROM Notification n
        WHERE n.deleted = false
          AND n.status = com.project.trosmart.enums.NotificationStatus.SCHEDULED
        """)
    LocalDateTime findNextScheduledAt();
}
