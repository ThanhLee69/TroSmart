package com.project.trosmart.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class NotificationDashboardResponse {

    // Tất cả thông báo chưa xóa (gồm cả CANCELLED)
    private long totalCount;

    // Đã gửi (SENT)
    private long sentCount;

    // Bản nháp (DRAFT)
    private long draftCount;

    // Đã lên lịch (SCHEDULED)
    private long scheduledCount;

    // Thời điểm hẹn gần nhất, null nếu không có thông báo nào chờ gửi
    private LocalDateTime nextScheduledAt;
}