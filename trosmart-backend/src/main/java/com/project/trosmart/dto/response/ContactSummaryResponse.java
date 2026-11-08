package com.project.trosmart.dto.response;

import lombok.Builder;
import lombok.Getter;

// Số lượng theo trạng thái, dùng cho thẻ thống kê và badge "mới" trên menu admin
@Getter
@Builder
public class ContactSummaryResponse {

    private long total;
    private long newCount;
    private long readCount;
    private long repliedCount;
}
