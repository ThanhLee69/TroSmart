package com.project.trosmart.dto.request;

import com.project.trosmart.enums.IssueStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueStatusRequest {

    @NotNull(message = "Issue status is required")
    private IssueStatus status;
}