
package com.project.trosmart.repository;

import com.project.trosmart.entity.Amenity;
import com.project.trosmart.enums.AmenityScope;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AmenityRepository extends JpaRepository<Amenity, Long> {

    // Lấy tiện nghi theo các scope được chỉ định
    @Query("""
        SELECT a
        FROM Amenity a
        WHERE a.deleted = false
          AND a.scope IN :scopes
        ORDER BY a.name ASC
        """)
    List<Amenity> findByScopes(
            @Param("scopes") List<AmenityScope> scopes
    );

    // Kiểm tra tên tiện nghi đã tồn tại khi tạo mới
    boolean existsByNameIgnoreCaseAndDeletedFalse(String name);

    // Kiểm tra tên tiện nghi đã tồn tại khi cập nhật
    boolean existsByNameIgnoreCaseAndIdNotAndDeletedFalse(
            String name,
            Long id
    );

    // Tìm kiếm và phân trang tiện nghi trong trang quản trị
    @Query("""
        SELECT a
        FROM Amenity a
        WHERE a.deleted = false
          AND (
              :keyword IS NULL
              OR LOWER(a.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(a.description) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
          AND (:scope IS NULL OR a.scope = :scope)
        """)
    Page<Amenity> search(
            @Param("keyword") String keyword,
            @Param("scope") AmenityScope scope,
            Pageable pageable
    );
}
