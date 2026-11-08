package com.project.trosmart.repository;

import com.project.trosmart.entity.User;
import com.project.trosmart.enums.Role;
import com.project.trosmart.enums.UserStatus;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByUsernameAndDeletedFalse(String username);

    Optional<User> findByUsernameAndDeletedFalse(String username);

    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    @Query("""
    SELECT u.fullName
    FROM User u
    WHERE u.username = :username
      AND u.deleted = false
    """)
    Optional<String> findFullNameByUsername(@Param("username") String username);

    boolean existsByTenant_IdAndDeletedFalse(Long tenantId);

    @Query("""
        SELECT u FROM User u
        WHERE u.deleted = false
        AND (
            :keyword IS NULL
            OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
            OR LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
        AND (:role IS NULL OR u.role = :role)
        AND (:status IS NULL OR u.status = :status)
        """)
    Page<User> findAllWithFilter(
            @Param("keyword") String keyword,
            @Param("role") Role role,
            @Param("status") UserStatus status,
            Pageable pageable
    );
}