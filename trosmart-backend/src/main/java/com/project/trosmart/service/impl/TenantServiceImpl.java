package com.project.trosmart.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.TenantRequest;
import com.project.trosmart.dto.response.*;
import com.project.trosmart.entity.*;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.TenantRentalStatus;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.TenantMapper;
import com.project.trosmart.repository.ContractTenantRepository;
import com.project.trosmart.repository.TenantRepository;
import com.project.trosmart.service.TenantService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class TenantServiceImpl implements TenantService {

    private final TenantRepository tenantRepository;
    private final ContractTenantRepository contractTenantRepository;
    private final TenantMapper tenantMapper;
    private final Cloudinary cloudinary;

    // =====================================================
    // 1. THÊM KHÁCH THUÊ
    // =====================================================

    @Override
    public TenantResponse createTenant(TenantRequest request) {
        normalizeRequest(request);
        validateTenant(request, null);

        Tenant tenant = tenantMapper.toEntity(request);
        Tenant savedTenant = tenantRepository.save(tenant);

        return tenantMapper.toResponse(savedTenant);
    }

    // =====================================================
    // 2. CẬP NHẬT KHÁCH THUÊ
    // =====================================================

    @Override
    public TenantResponse updateTenant(Long id, TenantRequest request) {
        Tenant tenant = getActiveTenant(id);

        normalizeRequest(request);
        validateTenant(request, id);

        tenantMapper.updateEntity(request, tenant);

        Tenant savedTenant = tenantRepository.save(tenant);

        return toTenantResponse(savedTenant);
    }

    // =====================================================
    // 3. XEM CHI TIẾT KHÁCH THUÊ
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public TenantResponse getTenantById(Long id) {
        Tenant tenant = getActiveTenant(id);

        return toTenantResponse(tenant);
    }

    // =====================================================
    // 4. TÌM KIẾM, PHÂN TRANG
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TenantResponse> searchTenants(
            String keyword,
            TenantRentalStatus rentalStatus,
            int page,
            int size
    ) {
        String normalizedKeyword = normalizeKeyword(keyword);

        Page<Tenant> tenantPage = tenantRepository.searchTenant(
                normalizedKeyword,
                rentalStatus,
                PageRequest.of(
                        page - 1,
                        size,
                        Sort.by(Sort.Direction.DESC, "createdAt")
                )
        );

        List<TenantResponse> items = tenantPage.getContent()
                .stream()
                .map(this::toTenantResponse)
                .toList();

        return PageResponse.<TenantResponse>builder()
                .items(items)
                .currentPage(tenantPage.getNumber() + 1)
                .pageSize(tenantPage.getSize())
                .totalItems(tenantPage.getTotalElements())
                .totalPages(tenantPage.getTotalPages())
                .build();
    }

    // =====================================================
    // 5. XÓA MỀM KHÁCH THUÊ
    // =====================================================

    @Override
    public void deleteTenant(Long id) {
        Tenant tenant = getActiveTenant(id);

        // Không cho xóa khách vẫn đang có hợp đồng hiện tại.
        if (contractTenantRepository.hasCurrentContract(id)) {
            throw new AppException(
                    ErrorCode.TENANT_HAS_ACTIVE_CONTRACT
            );
        }

        tenant.setDeleted(true);
        tenantRepository.save(tenant);
    }

    // =====================================================
    // 6. THỐNG KÊ KHÁCH THUÊ
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public TenantDashboardResponse getTenantDashboard() {
        long totalTenants = tenantRepository.countByDeletedFalse();

        long rentingTenants =
                tenantRepository.countByDeletedFalseAndRentalStatus(
                        TenantRentalStatus.RENTING
                );

        long returnedTenants =
                tenantRepository.countByDeletedFalseAndRentalStatus(
                        TenantRentalStatus.RETURNED
                );

        long tenantsWithoutAccount =
                tenantRepository.countByDeletedFalseAndUserIsNull();

        return TenantDashboardResponse.builder()
                .totalTenants(totalTenants)
                .rentingTenants(rentingTenants)
                .returnedTenants(returnedTenants)
                .tenantsWithoutAccount(tenantsWithoutAccount)
                .build();
    }

    // =====================================================
    // 7. DANH SÁCH LỰA CHỌN KHÁCH THUÊ
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<TenantOptionResponse> getTenantOptions(String keyword) {
        String normalizedKeyword = normalizeKeyword(keyword);

        return tenantRepository.findTenantOptions(normalizedKeyword)
                .stream()
                .map(tenant -> TenantOptionResponse.builder()
                        .id(tenant.getId())
                        .fullName(tenant.getFullName())
                        .phone(tenant.getPhone())
                        .build())
                .toList();
    }

    // =====================================================
    // 8. LẤY KHÁCH THUÊ CHƯA BỊ XÓA
    // =====================================================

    private Tenant getActiveTenant(Long id) {
        return tenantRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(
                        () -> new AppException(ErrorCode.TENANT_NOT_FOUND)
                );
    }

    // =====================================================
    // 9. KIỂM TRA DỮ LIỆU
    // =====================================================

    private void validateTenant(TenantRequest request, Long id) {
        String phone = request.getPhone();

        boolean phoneExists = id == null
                ? tenantRepository.existsByPhoneAndDeletedFalse(phone)
                : tenantRepository.existsByPhoneAndIdNotAndDeletedFalse(
                phone,
                id
        );

        if (phoneExists) {
            throw new AppException(ErrorCode.TENANT_PHONE_EXISTED);
        }

        String identityNumber = request.getIdentityNumber();

        if (StringUtils.hasText(identityNumber)) {
            boolean identityExists = id == null
                    ? tenantRepository
                    .existsByIdentityNumberAndDeletedFalse(identityNumber)
                    : tenantRepository
                    .existsByIdentityNumberAndIdNotAndDeletedFalse(
                            identityNumber,
                            id
                    );

            if (identityExists) {
                throw new AppException(
                        ErrorCode.TENANT_IDENTITY_NUMBER_EXISTED
                );
            }
        }
    }

    // =====================================================
    // 10. CHUẨN HÓA DỮ LIỆU
    // =====================================================

    private void normalizeRequest(TenantRequest request) {
        if (request.getFullName() != null) {
            request.setFullName(request.getFullName().trim());
        }

        if (request.getPhone() != null) {
            request.setPhone(request.getPhone().trim());
        }

        request.setEmail(trimToNull(request.getEmail()));
        request.setIdentityNumber(trimToNull(request.getIdentityNumber()));
        request.setPermanentAddress(
                trimToNull(request.getPermanentAddress())
        );
        request.setOccupation(trimToNull(request.getOccupation()));
        request.setNote(trimToNull(request.getNote()));
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return value.trim();
    }

    private String normalizeKeyword(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }

        return keyword.trim();
    }

    // =====================================================
    // 11. UPLOAD ẢNH CCCD LÊN CLOUDINARY
    // =====================================================

    @Override
    public TenantResponse updateIdentityImages(
            Long id,
            MultipartFile frontImage,
            MultipartFile backImage
    ) {
        Tenant tenant = getActiveTenant(id);

        if (!hasFile(frontImage) && !hasFile(backImage)) {
            throw new IllegalArgumentException(
                    "Vui lòng chọn ít nhất một ảnh CCCD"
            );
        }

        String oldFrontImage = tenant.getIdentityFrontImage();
        String oldBackImage = tenant.getIdentityBackImage();

        List<String> uploadedPublicIds = new ArrayList<>();

        String newFrontImage = null;
        String newBackImage = null;

        try {
            if (hasFile(frontImage)) {
                UploadResult result = uploadIdentityImage(
                        frontImage,
                        "front"
                );

                newFrontImage = result.url();
                uploadedPublicIds.add(result.publicId());
            }

            if (hasFile(backImage)) {
                UploadResult result = uploadIdentityImage(
                        backImage,
                        "back"
                );

                newBackImage = result.url();
                uploadedPublicIds.add(result.publicId());
            }
        } catch (RuntimeException exception) {
            deleteUploadedImages(uploadedPublicIds);
            throw exception;
        }

        if (newFrontImage != null) {
            tenant.setIdentityFrontImage(newFrontImage);
        }

        if (newBackImage != null) {
            tenant.setIdentityBackImage(newBackImage);
        }

        Tenant savedTenant;

        try {
            savedTenant = tenantRepository.saveAndFlush(tenant);
        } catch (RuntimeException exception) {
            deleteUploadedImages(uploadedPublicIds);
            throw exception;
        }

        // Chỉ xóa ảnh cũ sau khi database lưu thành công.
        if (newFrontImage != null) {
            deleteOldIdentityImage(oldFrontImage);
        }

        if (newBackImage != null) {
            deleteOldIdentityImage(oldBackImage);
        }

        return toTenantResponse(savedTenant);
    }

    // =====================================================
    // 12. LỊCH SỬ THUÊ CỦA KHÁCH
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<TenantContractHistoryResponse> getTenantContracts(Long tenantId) {
        // Trả 404 nếu khách không tồn tại hoặc đã bị xóa
        getActiveTenant(tenantId);

        return contractTenantRepository.findHistoryByTenantId(tenantId)
                .stream()
                .map(contractTenant -> {
                    Contract contract = contractTenant.getContract();
                    Room room = contract.getRoom();
                    Building building = room != null ? room.getBuilding() : null;

                    return TenantContractHistoryResponse.builder()
                            .id(contract.getId())
                            .contractCode(contract.getContractCode())
                            .roomNumber(room != null ? room.getRoomNumber() : null)
                            .buildingName(building != null ? building.getName() : null)
                            .startDate(contract.getStartDate())
                            .endDate(contract.getEndDate())
                            .actualEndDate(contract.getActualEndDate())
                            .rentPrice(contract.getRentPrice())
                            .status(contract.getStatus() != null
                                    ? contract.getStatus().name()
                                    : null)
                            .primary(Boolean.TRUE.equals(contractTenant.getIsPrimary()))
                            .build();
                })
                .toList();
    }

    private UploadResult uploadIdentityImage(
            MultipartFile file,
            String side
    ) {
        validateIdentityImage(file);

        String publicId = "trosmart/tenant-identity/"
                + side
                + "_"
                + UUID.randomUUID();

        try {
            Map<?, ?> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id", publicId,
                            "overwrite", false,
                            "resource_type", "image"
                    )
            );

            String secureUrl = (String) result.get("secure_url");

            if (!StringUtils.hasText(secureUrl)) {
                throw new IllegalStateException(
                        "Cloudinary không trả về URL ảnh"
                );
            }

            return new UploadResult(secureUrl, publicId);

        } catch (IOException exception) {
            throw new AppException(
                    ErrorCode.TENANT_IDENTITY_IMAGE_UPLOAD_FAILED
            );
        } catch (RuntimeException exception) {
            if (exception instanceof AppException appException) {
                throw appException;
            }

            throw new AppException(
                    ErrorCode.TENANT_IDENTITY_IMAGE_UPLOAD_FAILED
            );
        }
    }

    private void validateIdentityImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(
                    "Ảnh CCCD không được để trống"
            );
        }

        String contentType = file.getContentType();

        if (contentType == null
                || !(contentType.equals("image/jpeg")
                || contentType.equals("image/png")
                || contentType.equals("image/webp"))) {
            throw new IllegalArgumentException(
                    "Ảnh CCCD chỉ hỗ trợ JPG, PNG hoặc WEBP"
            );
        }

        if (file.getSize() > 5L * 1024 * 1024) {
            throw new IllegalArgumentException(
                    "Ảnh CCCD không được vượt quá 5 MB"
            );
        }
    }

    private boolean hasFile(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    /**
     * Xóa những ảnh vừa upload nếu thao tác lưu thất bại.
     */
    private void deleteUploadedImages(List<String> publicIds) {
        for (String publicId : publicIds) {
            try {
                cloudinary.uploader().destroy(
                        publicId,
                        ObjectUtils.asMap("resource_type", "image")
                );
            } catch (Exception ignored) {
                // Không ghi đè lỗi ban đầu bằng lỗi dọn ảnh.
            }
        }
    }

    /**
     * Lấy public_id từ URL Cloudinary thông thường.
     */
    private String extractPublicId(String imageUrl) {
        if (!StringUtils.hasText(imageUrl)) {
            return null;
        }

        try {
            String path = URI.create(imageUrl).getPath();
            String marker = "/upload/";

            int uploadIndex = path.indexOf(marker);

            if (uploadIndex < 0) {
                return null;
            }

            String publicId = path.substring(
                    uploadIndex + marker.length()
            );

            // Bỏ version, ví dụ v1234567890/
            publicId = publicId.replaceFirst("^v\\d+/", "");

            // Bỏ phần đuôi file, ví dụ .jpg, .png, .webp
            int extensionIndex = publicId.lastIndexOf('.');

            if (extensionIndex >= 0) {
                publicId = publicId.substring(0, extensionIndex);
            }

            return publicId;

        } catch (Exception exception) {
            return null;
        }
    }

    /**
     * Xóa ảnh CCCD cũ sau khi database cập nhật thành công.
     */
    private void deleteOldIdentityImage(String imageUrl) {
        String publicId = extractPublicId(imageUrl);

        if (!StringUtils.hasText(publicId)) {
            return;
        }

        try {
            cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", "image")
            );
        } catch (Exception ignored) {
            // Không làm hỏng kết quả cập nhật nếu xóa ảnh cũ thất bại.
        }
    }

    private record UploadResult(String url, String publicId) {
    }

    /**
     * Chuyển Tenant thành TenantResponse, bổ sung tên phòng và tòa nhà
     * từ hợp đồng hiện tại của khách thuê.
     */
    private TenantResponse toTenantResponse(Tenant tenant) {
        TenantResponse response = tenantMapper.toResponse(tenant);

        List<ContractTenant> currentContracts =
                contractTenantRepository.findCurrentContractsByTenant(
                        tenant.getId(),
                        ContractStatus.ACTIVE
                );

        if (!currentContracts.isEmpty()) {
            Contract contract = currentContracts.get(0).getContract();
            Room room = contract.getRoom();
            Building building = room != null ? room.getBuilding() : null;

            response.setBuildingName(
                    building != null ? building.getName() : null
            );

            response.setRoomNumber(
                    room != null ? room.getRoomNumber() : null
            );
        }

        return response;
    }
}