package com.project.trosmart.enums;

public enum InvoiceStatus {
    UNPAID,            // Chưa thanh toán
    PARTIALLY_PAID,    // Thanh toán một phần
    PAID,              // Đã thanh toán đủ
    OVERDUE,           // Quá hạn thanh toán
    CANCELLED          // Đã hủy
}
