package com.project.trosmart.service;

import com.project.trosmart.dto.request.InvoiceCancelRequest;
import com.project.trosmart.dto.request.InvoicePreviewRequest;
import com.project.trosmart.dto.request.InvoiceRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.InvoiceStatus;

import java.util.List;

public interface InvoiceService {

    // 1. Danh sách hóa đơn: lọc theo tòa nhà, kỳ, trạng thái, tìm theo mã hóa đơn hoặc mã phòng
    PageResponse<InvoiceResponse> getInvoices(
            Long buildingId,
            Integer billingMonth,
            Integer billingYear,
            InvoiceStatus status,
            String keyword,
            int page,
            int size
    );

    // 2. Các thẻ thống kê của kỳ đang lọc
    InvoiceDashboardResponse getInvoiceDashboard(
            Long buildingId,
            Integer billingMonth,
            Integer billingYear
    );

    // 3. Chi tiết hóa đơn (kèm các dòng và lịch sử thanh toán)
    InvoiceDetailResponse getInvoiceById(Long id);

    // 4. Hợp đồng ACTIVE chưa có hóa đơn (chưa hủy) trong kỳ: dùng cho ô chọn hợp đồng
    List<InvoiceContractOptionResponse> getAvailableContracts(
            Integer billingMonth,
            Integer billingYear
    );

    // 5. Lập hóa đơn từ hợp đồng + kỳ: dựng dòng tiền phòng, điện, nước, dịch vụ
    //    cộng phụ phí/giảm giá nhập tay, khóa bản ghi điện nước (INVOICED)
    InvoiceDetailResponse createInvoice(InvoiceRequest request);

    // 5b. Xem trước các dòng tự động và tổng tiền của hóa đơn sắp lập (không lưu gì)
    InvoicePreviewResponse previewInvoice(InvoicePreviewRequest request);

    // 6. Hủy hóa đơn (chỉ khi chưa có thanh toán): mở khóa điện nước, gỡ liên kết
    InvoiceDetailResponse cancelInvoice(Long id, InvoiceCancelRequest request);

    // 8. Job chạy mỗi ngày: hóa đơn quá hạn và còn nợ => OVERDUE
    void markOverdueInvoices();

    InvoicePdfFile exportInvoicePdf(Long id);

}
