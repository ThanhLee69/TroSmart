package com.project.trosmart.repository;

import com.project.trosmart.entity.NotificationRecipient;
import com.project.trosmart.enums.NotificationStatus;
import com.project.trosmart.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, Long> {

    // Mỗi dòng: [notificationId, tổng người nhận, số người đã đọc]
    @Query("""
        SELECT r.notification.id,
               COUNT(r),
               SUM(CASE WHEN r.isRead = true THEN 1 ELSE 0 END)
        FROM NotificationRecipient r
        WHERE r.notification.id IN :notificationIds
          AND r.deleted = false
        GROUP BY r.notification.id
        """)
    List<Object[]> countByNotificationIds(
            @Param("notificationIds") Collection<Long> notificationIds
    );

    @Query(
            value = """
        SELECT r
        FROM NotificationRecipient r
        JOIN FETCH r.tenant t
        WHERE r.notification.id = :notificationId
          AND r.deleted = false
          AND (:isRead IS NULL OR r.isRead = :isRead)
        ORDER BY t.fullName ASC, r.id ASC
        """,
            countQuery = """
        SELECT COUNT(r)
        FROM NotificationRecipient r
        WHERE r.notification.id = :notificationId
          AND r.deleted = false
          AND (:isRead IS NULL OR r.isRead = :isRead)
        """
    )
    Page<NotificationRecipient> findRecipients(
            @Param("notificationId") Long notificationId,
            @Param("isRead") Boolean isRead,
            Pageable pageable
    );


    // ============ NotificationRecipientRepository ============
// Thông báo đã gửi của khách, mới nhất trước. unreadOnly = true chỉ lấy chưa đọc
    @Query(
            value = """
            SELECT r
            FROM NotificationRecipient r
            JOIN FETCH r.notification n
            WHERE r.tenant.id = :tenantId
              AND r.deleted = false
              AND n.deleted = false
              AND n.status = :status
              AND n.type IN :types
              AND (:unreadOnly = false OR r.isRead = false)
            ORDER BY n.sentAt DESC, r.id DESC
            """,
            countQuery = """
            SELECT COUNT(r)
            FROM NotificationRecipient r
            JOIN r.notification n
            WHERE r.tenant.id = :tenantId
              AND r.deleted = false
              AND n.deleted = false
              AND n.status = :status
              AND n.type IN :types
              AND (:unreadOnly = false OR r.isRead = false)
            """
    )
    Page<NotificationRecipient> findMyNotifications(
            @Param("tenantId") Long tenantId,
            @Param("status") NotificationStatus status,
            @Param("unreadOnly") boolean unreadOnly,
            @Param("types") Collection<NotificationType> types,
            Pageable pageable
    );
    @Query("""
            SELECT COUNT(r)
            FROM NotificationRecipient r
            JOIN r.notification n
            WHERE r.tenant.id = :tenantId
              AND r.deleted = false
              AND n.deleted = false
              AND n.status = :status
              AND r.isRead = false
            """)
    long countMyUnread(
            @Param("tenantId") Long tenantId,
            @Param("status") NotificationStatus status
    );
    Optional<NotificationRecipient> findByNotificationIdAndTenantIdAndDeletedFalse(
            Long notificationId, Long tenantId);

    long countByTenantIdAndIsReadFalseAndDeletedFalse(Long tenantId);

    @Modifying(clearAutomatically = true)
    @Query("""
        UPDATE NotificationRecipient r
        SET r.isRead = true, r.readAt = :now
        WHERE r.tenant.id = :tenantId
          AND r.deleted = false
          AND r.isRead = false
        """)
    int markAllRead(@Param("tenantId") Long tenantId, @Param("now") LocalDateTime now);
}
