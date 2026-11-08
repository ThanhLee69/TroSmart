package com.project.trosmart.dto.request;

import com.project.trosmart.enums.NotificationPriority;
import com.project.trosmart.enums.NotificationTargetType;
import com.project.trosmart.enums.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
    private String title;

    @NotBlank(message = "Nội dung không được để trống")
    @Size(max = 5000, message = "Nội dung tối đa 5000 ký tự")
    private String content;

    // Chủ trọ chỉ soạn ANNOUNCEMENT hoặc MAINTENANCE
    @NotNull(message = "Vui lòng chọn loại thông báo")
    private NotificationType type;

    // Bỏ trống thì mặc định NORMAL
    private NotificationPriority priority;

    @NotNull(message = "Vui lòng chọn đối tượng nhận")
    private NotificationTargetType targetType;

    // Chỉ cần đúng id theo targetType: BUILDING -> buildingId, ROOM -> roomId, TENANT -> tenantId
    private Long buildingId;

    private Long roomId;

    private Long tenantId;

    // Có giá trị thì hẹn giờ gửi (phải ở tương lai); để trống thì lưu nháp
    private LocalDateTime scheduledAt;
}
