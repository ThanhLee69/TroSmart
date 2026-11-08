
package com.project.trosmart.repository;

import com.project.trosmart.entity.ServiceItem;
import com.project.trosmart.enums.BillingType;
import com.project.trosmart.enums.ServiceCode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceItemRepository extends JpaRepository<ServiceItem, Long> {

    boolean existsByServiceCodeAndDeletedFalse(ServiceCode serviceCode);
    /**
     * Phân trang, tìm kiếm dịch vụ theo tên
     * và lọc theo cách tính phí.
     */
    @Query("""
        SELECT s
        FROM ServiceItem s
        WHERE s.deleted = false
          AND (
              :keyword IS NULL
              OR TRIM(:keyword) = ''
              OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
          AND (
              :billingType IS NULL
              OR s.billingType = :billingType
          )
        ORDER BY s.name ASC
    """)
    Page<ServiceItem> searchServiceItems(
            @Param("keyword") String keyword,
            @Param("billingType") BillingType billingType,
            Pageable pageable
    );

    /**
     * Lấy dịch vụ theo ID, không lấy bản ghi đã xóa mềm.
     */
    Optional<ServiceItem> findByIdAndDeletedFalse(Long id);

    /**
     * Kiểm tra tên dịch vụ đã tồn tại hay chưa.
     */
    boolean existsByNameIgnoreCaseAndDeletedFalse(String name);

    /**
     * Kiểm tra trùng tên khi cập nhật,
     * loại trừ chính dịch vụ đang chỉnh sửa.
     */
    boolean existsByNameIgnoreCaseAndDeletedFalseAndIdNot(
            String name,
            Long id
    );


    /**
     * Lấy danh sách dịch vụ để hiển thị ở Select.
     */
    @Query("""
        SELECT s
        FROM ServiceItem s
        WHERE s.deleted = false
          AND (
              :keyword IS NULL
              OR TRIM(:keyword) = ''
              OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
          )
        ORDER BY s.name ASC
    """)
    List<ServiceItem> findServiceItemOptions(
            @Param("keyword") String keyword
    );
}
