package com.project.trosmart.dto.request;

import com.project.trosmart.enums.IssueCategory;
import com.project.trosmart.enums.IssuePriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueRequest {

    @NotBlank(message = "Vui lòng nhập tiêu đề yêu cầu.")
    @Size(max = 150, message = "Tiêu đề yêu cầu không được vượt quá 150 ký tự.")
    private String title;

    @NotBlank(message = "Vui lòng nhập nội dung mô tả sự cố.")
    private String description;

    @NotNull(message = "Vui lòng chọn danh mục sự cố.")
    private IssueCategory category;

    @NotNull(message = "Vui lòng chọn mức độ ưu tiên.")
    private IssuePriority priority;

    private String note;
}