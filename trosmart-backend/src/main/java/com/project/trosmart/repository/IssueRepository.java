
package com.project.trosmart.repository;

import com.project.trosmart.entity.Issue;
import com.project.trosmart.enums.IssueCategory;
import com.project.trosmart.enums.IssuePriority;
import com.project.trosmart.enums.IssueStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface IssueRepository extends JpaRepository<Issue, Long> {

    /**
     * Tìm danh sách sự cố theo từ khóa, trạng thái,
     * mức độ ưu tiên và phòng.
     */
    @Query("""
    SELECT i
    FROM Issue i
    WHERE i.deleted = false
      AND (
            :keyword IS NULL
            OR LOWER(i.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(i.tenant.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(i.room.roomNumber) LIKE LOWER(CONCAT('%', :keyword, '%'))
      )
      AND (:status IS NULL OR i.status = :status)
      AND (:category IS NULL OR i.category = :category)
      AND (:priority IS NULL OR i.priority = :priority)
    """)
    Page<Issue> findIssues(
            @Param("keyword") String keyword,
            @Param("status") IssueStatus status,
            @Param("category") IssueCategory category,
            @Param("priority") IssuePriority priority,
            Pageable pageable
    );
    Optional<Issue> findByIdAndDeletedFalse(Long id);
    /**
     * Đếm số sự cố theo trạng thái.
     */
    long countByStatusAndDeletedFalse(IssueStatus status);

    /**
     * Đếm tổng số sự cố chưa bị xóa mềm.
     */
    long countByDeletedFalse();


    // ============ IssueRepository ============
    Page<Issue> findByTenantIdAndDeletedFalse(Long tenantId, Pageable pageable);

    long countByTenantIdAndDeletedFalseAndStatusIn(Long tenantId, Collection<IssueStatus> statuses);

    List<Issue> findByRoom_IdAndDeletedFalseOrderByCreatedAtDesc(
            Long roomId,
            Pageable pageable
    );
}
