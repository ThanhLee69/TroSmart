
package com.project.trosmart.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDashboardResponse {

    /**
     * Tổng số hồ sơ khách thuê trong hệ thống.
     */
    private Long totalTenants;

    /**
     * Số khách hiện đang thuê phòng.
     */
    private Long rentingTenants;

    /**
     * Số khách đã trả phòng.
     */
    private Long returnedTenants;

    /**
     * Số khách chưa có tài khoản đăng nhập.
     */
    private Long tenantsWithoutAccount;
}
