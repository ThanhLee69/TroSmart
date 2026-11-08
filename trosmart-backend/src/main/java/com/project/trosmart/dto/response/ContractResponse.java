package com.project.trosmart.dto.response;

import com.project.trosmart.enums.ContractStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Bản rút gọn, chỉ những gì bảng danh sách hợp đồng cần hiển thị.
 * Chi tiết đầy đủ nằm ở ContractDetailResponse.
 */
@Getter
@Setter
@Builder
public class ContractResponse {

    private Long id;
    private String contractCode;

    // Phòng và tòa nhà
    private Long roomId;
    private String roomNumber;
    private String buildingName;

    // Người đứng tên hợp đồng
    private Long tenantId;
    private String tenantName;
    private String tenantPhone;

    // Thời hạn và tiền
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal rentPrice;
    private BigDecimal deposit;

    private ContractStatus status;
}