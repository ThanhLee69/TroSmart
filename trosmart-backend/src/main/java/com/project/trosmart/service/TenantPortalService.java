package com.project.trosmart.service;

import com.project.trosmart.dto.request.ChangeMyPasswordRequest;
import com.project.trosmart.dto.request.IssueRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.enums.InvoiceStatus;
import com.project.trosmart.enums.NotificationType;

import java.util.List;

// Mọi hàm đều làm việc với khách thuê đang đăng nhập, không nhận tenantId từ ngoài
public interface TenantPortalService {


    MyTenantDashboardResponse getDashboard();

    // Phòng hợp đồng
    MyContractResponse getMyContract();

    List<MyVehicleResponse> getMyVehicles();

    //Hóa đơn
// Thay chữ ký cũ getMyInvoices(int page, int size) bằng:
    PageResponse<MyInvoiceResponse> getMyInvoices(int page, int size, List<InvoiceStatus> statuses);

    // Thêm mới:
    MyInvoiceSummaryResponse getMyInvoiceSummary();

    MyInvoiceDetailResponse getMyInvoiceDetail(Long invoiceId);

    //Sửa chữa
    PageResponse<MyIssueResponse> getMyIssues(int page, int size);

    MyIssueResponse createMyIssue(IssueRequest request);

    MyIssueResponse cancelMyIssue(Long issueId);

    //Thông báo
    PageResponse<MyNotificationResponse> getMyNotifications(
            int page,
            int size,
            boolean unreadOnly,
            List<NotificationType> types
    );
    long getMyUnreadNotificationCount();

    void markNotificationRead(Long notificationId);

    void markAllNotificationsRead();

    //Tài khoản
    MyProfileResponse getMyProfile();

    void changeMyPassword(ChangeMyPasswordRequest request);
}