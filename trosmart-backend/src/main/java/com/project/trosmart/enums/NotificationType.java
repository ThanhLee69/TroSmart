package com.project.trosmart.enums;

public enum NotificationType {

    ANNOUNCEMENT,      // Thông báo chung do chủ trọ soạn
    MAINTENANCE,       // Thông báo bảo trì, sửa chữa do chủ trọ soạn
    INVOICE_CREATED,   // Hệ thống: đã lập hóa đơn
    PAYMENT_REMINDER,  // Hệ thống: nhắc thanh toán, quá hạn
    CONTRACT_EXPIRING, // Hệ thống: hợp đồng sắp hết hạn
    SYSTEM             // Hệ thống: thông báo khác
}
