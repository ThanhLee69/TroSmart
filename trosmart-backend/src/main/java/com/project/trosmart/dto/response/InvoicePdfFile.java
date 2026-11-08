package com.project.trosmart.dto.response;

/**
 * File PDF hóa đơn: tên file gợi ý và nội dung.
 */
public record InvoicePdfFile(String fileName, byte[] content) {
}
