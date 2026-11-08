package com.project.trosmart.entity;

import com.project.trosmart.enums.NotificationPriority;
import com.project.trosmart.enums.NotificationStatus;
import com.project.trosmart.enums.NotificationTargetType;
import com.project.trosmart.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// Nội dung thông báo, lưu một lần. Trạng thái đã đọc nằm ở NotificationRecipient
@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_status_scheduled", columnList = "status, scheduled_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    @Builder.Default
    private NotificationPriority priority = NotificationPriority.NORMAL;

    // Gửi cho ai
    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private NotificationTargetType targetType;

    // Chỉ có giá trị tương ứng với targetType (BUILDING / ROOM / TENANT)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id")
    private Building building;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id")
    private Tenant tenant;

    // Id đối tượng gốc, hiểu theo type: INVOICE_CREATED / PAYMENT_REMINDER -> id hóa đơn,
    // CONTRACT_EXPIRING -> id hợp đồng, các loại còn lại để null
    @Column(name = "related_id")
    private Long relatedId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private NotificationStatus status = NotificationStatus.DRAFT;

    // Thời điểm hẹn gửi (status = SCHEDULED)
    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    // Thời điểm đã gửi
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
}
