package com.project.trosmart.controller;

import com.project.trosmart.dto.request.ContactUpdateRequest;
import com.project.trosmart.dto.response.ApiResponse;
import com.project.trosmart.dto.response.ContactResponse;
import com.project.trosmart.dto.response.ContactSummaryResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.enums.ContactStatus;
import com.project.trosmart.enums.ContactTopic;
import com.project.trosmart.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Quản lý liên hệ do khách gửi từ website. Phân quyền áp dụng chung cho cả controller: chỉ ADMIN được gọi.
 * (API gửi liên hệ của khách nằm ở PublicController: POST /api/v1/public/contacts)
 */
@RestController
@RequestMapping("/api/v1/contacts")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMIN')")
@Tag(
        name = "Quản lý liên hệ",
        description = "API xem và xử lý các yêu cầu liên hệ do khách gửi từ website, "
                + "chỉ dành cho quản trị viên (ADMIN)"
)
public class ContactController {

    private final ContactService contactService;

    @GetMapping
    @Operation(
            summary = "Xem danh sách liên hệ",
            description = "Tìm theo tên, số điện thoại, email; lọc theo trạng thái và nhu cầu; "
                    + "mới nhất trước; có phân trang"
    )
    public ApiResponse<PageResponse<ContactResponse>> getContacts(
            @Parameter(description = "Từ khóa tìm theo tên, số điện thoại hoặc email. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) String keyword,

            @Parameter(description = "Lọc theo trạng thái xử lý. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) ContactStatus status,

            @Parameter(description = "Lọc theo nhu cầu liên hệ. Bỏ trống để lấy tất cả")
            @RequestParam(required = false) ContactTopic topic,

            @Parameter(description = "Số trang, bắt đầu từ 1", example = "1")
            @RequestParam(defaultValue = "1")
            @Min(value = 1, message = "Trang phải lớn hơn hoặc bằng 1")
            int page,

            @Parameter(description = "Số bản ghi mỗi trang, từ 1 đến 50", example = "10")
            @RequestParam(defaultValue = "10")
            @Min(value = 1, message = "Kích thước trang tối thiểu là 1")
            @Max(value = 50, message = "Kích thước trang tối đa là 50")
            int size
    ) {
        return ApiResponse.<PageResponse<ContactResponse>>builder()
                .code(200)
                .message("Get contacts successfully")
                .result(contactService.getContacts(keyword, status, topic, page, size))
                .build();
    }

    @GetMapping("/summary")
    @Operation(
            summary = "Xem thống kê liên hệ",
            description = "Trả về số lượng liên hệ theo từng trạng thái, dùng cho các thẻ thống kê"
    )
    public ApiResponse<ContactSummaryResponse> getSummary() {
        return ApiResponse.<ContactSummaryResponse>builder()
                .code(200)
                .message("Get contact summary successfully")
                .result(contactService.getSummary())
                .build();
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết liên hệ",
            description = "Mở lần đầu sẽ tự chuyển trạng thái từ NEW sang READ"
    )
    public ApiResponse<ContactResponse> getContactDetail(
            @Parameter(description = "ID liên hệ", example = "1")
            @PathVariable Long id
    ) {
        return ApiResponse.<ContactResponse>builder()
                .code(200)
                .message("Get contact detail successfully")
                .result(contactService.getContactDetail(id))
                .build();
    }

    @PatchMapping("/{id}")
    @Operation(
            summary = "Cập nhật trạng thái và ghi chú",
            description = "Cập nhật trạng thái xử lý và ghi chú nội bộ của liên hệ"
    )
    public ApiResponse<ContactResponse> updateContact(
            @Parameter(description = "ID liên hệ", example = "1")
            @PathVariable Long id,
            @Valid @RequestBody ContactUpdateRequest request
    ) {
        return ApiResponse.<ContactResponse>builder()
                .code(200)
                .message("Update contact successfully")
                .result(contactService.updateContact(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Xóa liên hệ",
            description = "Xóa một yêu cầu liên hệ theo ID"
    )
    public ApiResponse<Void> deleteContact(
            @Parameter(description = "ID liên hệ", example = "1")
            @PathVariable Long id
    ) {
        contactService.deleteContact(id);

        return ApiResponse.<Void>builder()
                .code(200)
                .message("Delete contact successfully")
                .build();
    }
}