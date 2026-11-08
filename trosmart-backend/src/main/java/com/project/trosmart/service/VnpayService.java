package com.project.trosmart.service;

import java.util.Map;

public interface VnpayService {

    /** Tạo link thanh toán VNPay cho số tiền còn nợ của hóa đơn */
    String createPaymentUrl(Long invoiceId, String ipAddress);


    VnpayResult handleCallback(Map<String, String> params);


    record VnpayResult(String rspCode, String message, Long invoiceId, boolean success) {
    }
}