package com.project.trosmart.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// Mỗi người nhận một dòng, lưu trạng thái đã đọc riêng cho từng người
@Entity
@Table(
        name = "notification_recipients",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_notification_recipient",
                columnNames = {"notification_id", "tenant_id"}
        ),
        indexes = @Index(name = "idx_recipient_tenant_read", columnList = "tenant_id, is_read")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationRecipient extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notification_id", nullable = false)
    private Notification notification;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;
}
