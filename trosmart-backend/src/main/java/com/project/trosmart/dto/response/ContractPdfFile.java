package com.project.trosmart.dto.response;

/**
 * File PDF hợp đồng: tên file gợi ý và nội dung.
 */
public record ContractPdfFile(String fileName, byte[] content) {
}
