package com.project.trosmart.service;

import com.project.trosmart.dto.request.PaymentRequest;
import com.project.trosmart.dto.response.InvoiceDetailResponse;
import com.project.trosmart.dto.response.PaymentResponse;

import java.util.List;

public interface PaymentService {

    // 1. Ghi nhận một lần thanh toán: cộng paidAmount, tính lại còn nợ, đổi trạng thái hóa đơn
    //    Trả về hóa đơn đã cập nhật để frontend vẽ lại ngay
    InvoiceDetailResponse createPayment(Long invoiceId, PaymentRequest request);

    // 2. Lịch sử thanh toán của một hóa đơn
    List<PaymentResponse> getPaymentsByInvoice(Long invoiceId);

    // 3. Xóa thanh toán nhập nhầm: trừ lại paidAmount, tính lại trạng thái hóa đơn
    InvoiceDetailResponse deletePayment(Long invoiceId, Long paymentId);
}
