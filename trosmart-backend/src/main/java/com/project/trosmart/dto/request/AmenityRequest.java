
package com.project.trosmart.dto.request;

import com.project.trosmart.enums.AmenityScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmenityRequest {

    @NotBlank(message = "Tên tiện nghi không được để trống")
    @Size(max = 100, message = "Tên tiện nghi không được vượt quá 100 ký tự")
    private String name;

    private String description;

    @NotNull(message = "Phạm vi tiện nghi không được để trống")
    private AmenityScope scope;
}
