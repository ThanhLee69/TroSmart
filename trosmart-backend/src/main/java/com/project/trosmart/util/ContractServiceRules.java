package com.project.trosmart.util;

import com.project.trosmart.entity.ContractServiceItem;
import com.project.trosmart.entity.ServiceItem;
import com.project.trosmart.enums.ServiceCode;

/**
 * Quy tắc dịch vụ bắt buộc của hợp đồng: điện, nước và dịch vụ đánh dấu
 * mặc định. Một chỗ duy nhất để cả mapper và service dùng chung.
 */
public final class ContractServiceRules {

    private ContractServiceRules() {
    }

    public static boolean isRequired(ServiceItem service) {
        if (service == null) {
            return false;
        }

        return Boolean.TRUE.equals(service.getDefaultService())
                || service.getServiceCode() == ServiceCode.ELECTRICITY
                || service.getServiceCode() == ServiceCode.WATER;
    }

    public static boolean isRemovable(ContractServiceItem item) {
        return !isRequired(item.getServiceItem());
    }
}