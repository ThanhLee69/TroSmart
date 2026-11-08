
package com.project.trosmart.repository;

import com.project.trosmart.entity.Building;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BuildingRepository extends JpaRepository<Building, Long> {

    @Query("""
        SELECT b
        FROM Building b
        WHERE b.deleted = false
          AND (
              :keyword IS NULL
              OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(b.address) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
        """)
    Page<Building> search(
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("""
    SELECT b
    FROM Building b
    WHERE b.deleted = false
      AND (
          :keyword IS NULL
          OR LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
          OR LOWER(b.address) LIKE LOWER(CONCAT('%', :keyword, '%'))
      )
    ORDER BY b.name ASC
    """)
    List<Building> findActiveBuildingOptions(
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
