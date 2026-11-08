package com.project.trosmart.entity;

import com.project.trosmart.enums.ContactStatus;
import com.project.trosmart.enums.ContactTopic;
import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "contact_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContactMessage extends BaseEntity {

    // BaseEntity không có id nên khai báo ở đây (đổi strategy cho giống các entity khác của bạn)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String fullName;

    // Đã chuẩn hóa: bỏ khoảng trắng, +84 đổi thành 0
    @Column(nullable = false, length = 15)
    private String phone;

    @Column(length = 150)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ContactTopic topic;

    @Column(nullable = false, length = 1000)
    private String message;

    // Phòng khách đang quan tâm (null nếu liên hệ chung)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ContactStatus status = ContactStatus.NEW;

    // Ghi chú nội bộ của chủ trọ
    @Column(length = 500)
    private String adminNote;

    // IP người gửi, để truy vết khi bị spam
    @Column(length = 45)
    private String ipAddress;
}
