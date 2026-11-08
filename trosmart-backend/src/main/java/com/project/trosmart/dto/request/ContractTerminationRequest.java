
package com.project.trosmart.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ContractTerminationRequest {

    @NotBlank(message = "Vui lòng nhập lý do chấm dứt hợp đồng")
    @Size(max = 5000, message = "Lý do không được vượt quá 5000 ký tự")
    private String terminationReason;
}