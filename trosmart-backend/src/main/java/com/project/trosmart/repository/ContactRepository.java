package com.project.trosmart.repository;

import com.project.trosmart.entity.ContactMessage;
import com.project.trosmart.enums.ContactStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface ContactRepository
        extends JpaRepository<ContactMessage, Long>, JpaSpecificationExecutor<ContactMessage> {

    // Lấy luôn phòng và tòa nhà để tránh N+1 khi map ra response
    @Override
    @EntityGraph(attributePaths = {"room", "room.building"})
    Page<ContactMessage> findAll(Specification<ContactMessage> spec, Pageable pageable);

    long countByStatus(ContactStatus status);

    // ===== Chống spam =====

    // Cùng số điện thoại vừa gửi gần đây
    boolean existsByPhoneAndCreatedAtAfter(String phone, LocalDateTime time);

    // Cùng số điện thoại gửi lại đúng nội dung cũ
    boolean existsByPhoneAndMessageAndCreatedAtAfter(String phone, String message, LocalDateTime time);

    // Tổng số liên hệ trong khoảng thời gian (trần theo ngày)
    long countByCreatedAtAfter(LocalDateTime time);
}
