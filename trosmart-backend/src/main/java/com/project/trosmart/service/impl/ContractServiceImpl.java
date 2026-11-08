package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.response.ContractPdfFile;
import com.project.trosmart.dto.request.ContractCoTenantRequest;
import com.project.trosmart.dto.request.ContractExtensionRequest;
import com.project.trosmart.dto.request.ContractRequest;
import com.project.trosmart.dto.request.ContractServiceRequest;
import com.project.trosmart.dto.request.ContractTerminationRequest;
import com.project.trosmart.dto.response.ContractDashboardResponse;
import com.project.trosmart.dto.response.ContractDetailResponse;
import com.project.trosmart.dto.response.ContractResponse;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.entity.*;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.TenantRentalStatus;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.ContractMapper;
import com.project.trosmart.pdf.ContractPdfData;
import com.project.trosmart.pdf.ContractPdfDataFactory;
import com.project.trosmart.pdf.ContractPdfRenderer;
import com.project.trosmart.repository.*;
import com.project.trosmart.service.ContractService;
import com.project.trosmart.util.ContractServiceRules;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ContractServiceImpl implements ContractService {

    private static final ZoneId VIETNAM_ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    // Các trạng thái phải được tính khi kiểm tra trùng lịch.
    private static final List<ContractStatus> BLOCKING_STATUSES =
            List.of(
                    ContractStatus.ACTIVE,
                    ContractStatus.DRAFT
            );

    private final ContractRepository contractRepository;
    private final ContractTenantRepository contractTenantRepository;
    private final RoomRepository roomRepository;
    private final TenantRepository tenantRepository;
    private final ContractMapper contractMapper;
    private final ContractServiceItemRepository contractServiceItemRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final ContractPdfDataFactory pdfDataFactory;
    private final ContractPdfRenderer pdfRenderer;

    // =====================================================
    // 1. TẠO HỢP ĐỒNG
    // =====================================================


    @Override
    @Transactional
    public ContractResponse createContract(ContractRequest request) {
        validateDates(request.getStartDate(), request.getEndDate());
        validateRentPrice(request.getRentPrice());

        // Lấy phòng và kiểm tra trạng thái phòng.
        Room room = getRoom(request.getRoomId());

        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new AppException(ErrorCode.ROOM_NOT_AVAILABLE_FOR_CONTRACT);
        }

        // Kiểm tra người đứng tên và danh sách người ở cùng.
        List<Tenant> coTenants = getContractTenants(request);
        Tenant primaryTenant = getTenant(request.getPrimaryTenantId());

        // Kiểm tra trùng lịch phòng với ACTIVE và DRAFT.
        validateRoomAvailable(
                room.getId(),
                request.getStartDate(),
                request.getEndDate(),
                null
        );

        // Kiểm tra tất cả người thuê với ACTIVE và DRAFT.
        validateTenantsAvailable(request, null);

        // Tạo hợp đồng.
        Contract contract = contractMapper.toEntity(request);

        contract.setContractCode(generateContractCode());
        contract.setRoom(room);

        contract.setDeposit(
                request.getDeposit() == null
                        ? BigDecimal.ZERO
                        : request.getDeposit()
        );
        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        if (!request.getStartDate().isAfter(today)) {
            contract.setStatus(ContractStatus.ACTIVE);
            room.setStatus(RoomStatus.OCCUPIED);
        } else {
            contract.setStatus(ContractStatus.DRAFT);
            room.setStatus(RoomStatus.RESERVED);
        }


// Tạm thời ép hợp đồng về DRAFT để Scheduler tự kích hoạt
        // Lưu trạng thái phòng và hợp đồng trong cùng transaction.
        roomRepository.save(room);

        Contract savedContract = contractRepository.save(contract);

        // Tạo liên kết với người đứng tên chính.
        List<ContractTenant> contractTenants = new ArrayList<>();

        ContractTenant primaryLink = new ContractTenant();
        primaryLink.setContract(savedContract);
        primaryLink.setTenant(primaryTenant);
        primaryLink.setIsPrimary(true);
        primaryLink.setMoveInDate(request.getStartDate());

        contractTenants.add(primaryLink);

        // Tạo liên kết với những người ở cùng.
        for (Tenant tenant : coTenants) {
            ContractTenant link = new ContractTenant();
            link.setContract(savedContract);
            link.setTenant(tenant);
            link.setIsPrimary(false);
            link.setMoveInDate(request.getStartDate());

            contractTenants.add(link);
        }

        contractTenantRepository.saveAll(contractTenants);
        if (contract.getStatus() == ContractStatus.ACTIVE) {
            for (ContractTenant contractTenant : contractTenants) {
                Tenant tenant = contractTenant.getTenant();
                tenant.setRentalStatus(TenantRentalStatus.RENTING);
            }

            tenantRepository.saveAll(
                    contractTenants.stream()
                            .map(ContractTenant::getTenant)
                            .distinct()
                            .toList()
            );
        }
        savedContract.setContractTenants(contractTenants);

        // Lưu dịch vụ và đơn giá áp dụng cho hợp đồng.
        List<ContractServiceItem> contractServices = new ArrayList<>();

        if (request.getServices() != null && !request.getServices().isEmpty()) {
            contractServices = createContractServices(
                    savedContract,
                    request.getServices()
            );

            if (!contractServices.isEmpty()) {
                contractServiceItemRepository.saveAll(contractServices);
            }
        }

        savedContract.setContractServices(contractServices);

        return contractMapper.toResponse(savedContract);
    }

    // =====================================================
    // 2. CẬP NHẬT HỢP ĐỒNG
    // =====================================================

    @Override
    public ContractResponse updateContract(
            Long contractId,
            ContractRequest request
    ) {
        Contract contract = getContract(contractId);

        // Chỉ được chỉnh sửa hợp đồng nháp.
        // Hợp đồng đang hiệu lực dùng: gia hạn / chấm dứt / (các hàm riêng).
        if (contract.getStatus() != ContractStatus.DRAFT) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_STATUS);
        }

        validateDates(request.getStartDate(), request.getEndDate());
        validateRentPrice(request.getRentPrice());

        Room room = getRoom(request.getRoomId());

        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            throw new AppException(ErrorCode.ROOM_NOT_AVAILABLE_FOR_CONTRACT);
        }

        List<Tenant> coTenants = getContractTenants(request);
        Tenant primaryTenant = getTenant(request.getPrimaryTenantId());

        // Loại trừ chính hợp đồng đang sửa khỏi việc kiểm tra trùng.
        validateRoomAvailable(
                room.getId(),
                request.getStartDate(),
                request.getEndDate(),
                contractId
        );
        validateTenantsAvailable(request, contractId);

        // Ghi nhớ trước khi mapper ghi đè.
        Room oldRoom = contract.getRoom();
        String contractCode = contract.getContractCode();

        contractMapper.updateEntity(contract, request);

        // Những trường không được phép đổi khi sửa.
        contract.setContractCode(contractCode);
        contract.setStatus(ContractStatus.DRAFT);

        contract.setRoom(room);
        contract.setDeposit(
                request.getDeposit() == null
                        ? BigDecimal.ZERO
                        : request.getDeposit()
        );

        syncContractTenants(
                contract,
                primaryTenant,
                coTenants,
                request.getStartDate()
        );

        // services == null: giữ nguyên; danh sách rỗng: xóa hết dịch vụ.
        if (request.getServices() != null) {
            syncContractServices(contract, request.getServices());
        }

        Contract savedContract = contractRepository.save(contract);

        syncRoomStatusWhenRoomChanged(oldRoom, room);

        return contractMapper.toResponse(savedContract);
    }

    /**
     * Đồng bộ người thuê theo kiểu so sánh: người còn giữ thì cập nhật,
     * người bị bỏ thì xóa, người mới thì thêm. Không thay collection
     * (setContractTenants) vì sẽ lỗi với orphanRemoval và dễ vi phạm
     * ràng buộc unique (contract, tenant) khi thêm lại cùng người.
     */
    private void syncContractTenants(
            Contract contract,
            Tenant primaryTenant,
            List<Tenant> coTenants,
            LocalDate moveInDate
    ) {
        // tenantId -> có phải người đứng tên chính không
        Map<Long, Boolean> desired = new LinkedHashMap<>();
        Map<Long, Tenant> tenantById = new HashMap<>();

        desired.put(primaryTenant.getId(), true);
        tenantById.put(primaryTenant.getId(), primaryTenant);

        for (Tenant tenant : coTenants) {
            desired.put(tenant.getId(), false);
            tenantById.put(tenant.getId(), tenant);
        }

        List<ContractTenant> existing =
                contractTenantRepository.findByContractIdAndDeletedFalse(
                        contract.getId()
                );

        List<ContractTenant> removed = new ArrayList<>();
        Set<Long> kept = new HashSet<>();

        for (ContractTenant link : existing) {
            Long tenantId = link.getTenant().getId();

            if (desired.containsKey(tenantId)) {
                link.setIsPrimary(desired.get(tenantId));
                link.setMoveInDate(moveInDate);
                kept.add(tenantId);
            } else {
                removed.add(link);
            }
        }

        if (contract.getContractTenants() == null) {
            contract.setContractTenants(new ArrayList<>());
        }

        if (!removed.isEmpty()) {
            contract.getContractTenants().removeAll(removed);
            contractTenantRepository.deleteAll(removed);
            // Xóa trước khi chèn để không đụng ràng buộc unique.
            contractTenantRepository.flush();
        }

        List<ContractTenant> added = new ArrayList<>();

        for (Map.Entry<Long, Boolean> entry : desired.entrySet()) {
            if (kept.contains(entry.getKey())) {
                continue;
            }

            ContractTenant link = new ContractTenant();
            link.setContract(contract);
            link.setTenant(tenantById.get(entry.getKey()));
            link.setIsPrimary(entry.getValue());
            link.setMoveInDate(moveInDate);

            added.add(link);
        }

        if (!added.isEmpty()) {
            contractTenantRepository.saveAll(added);
            contract.getContractTenants().addAll(added);
        }
    }

    /**
     * Thay toàn bộ dịch vụ của hợp đồng nháp bằng danh sách mới.
     */
    private void syncContractServices(
            Contract contract,
            List<ContractServiceRequest> services
    ) {
        List<ContractServiceItem> old =
                contractServiceItemRepository.findByContractId(
                        contract.getId()
                );

        if (!old.isEmpty()) {
            contractServiceItemRepository.deleteAll(old);
            contractServiceItemRepository.flush();
        }

        List<ContractServiceItem> fresh =
                createContractServices(contract, services);

        if (!fresh.isEmpty()) {
            contractServiceItemRepository.saveAll(fresh);
        }

        if (contract.getContractServices() == null) {
            contract.setContractServices(new ArrayList<>());
        } else {
            contract.getContractServices().clear();
        }

        contract.getContractServices().addAll(fresh);
    }

    /**
     * Đổi phòng của hợp đồng nháp: phòng mới thành RESERVED,
     * phòng cũ về AVAILABLE nếu không còn hợp đồng ACTIVE/DRAFT nào.
     */
    private void syncRoomStatusWhenRoomChanged(Room oldRoom, Room newRoom) {
        if (oldRoom == null || oldRoom.getId().equals(newRoom.getId())) {
            return;
        }

        newRoom.setStatus(RoomStatus.RESERVED);
        roomRepository.save(newRoom);

        boolean oldRoomBusy =
                contractRepository.existsByRoomIdAndDeletedFalseAndStatusIn(
                        oldRoom.getId(),
                        BLOCKING_STATUSES
                );

        if (!oldRoomBusy && oldRoom.getStatus() == RoomStatus.RESERVED) {
            oldRoom.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(oldRoom);
        }
    }

    // =====================================================
    // 3. LẤY HỢP ĐỒNG THEO ID
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public ContractDetailResponse getContractById(Long contractId) {
        return contractMapper.toDetailResponse(getContract(contractId));
    }

    // =====================================================
    // 4. DANH SÁCH HỢP ĐỒNG
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ContractResponse> getContracts(
            String keyword,
            ContractStatus status,
            Long buildingId,

            int page,
            int size
    ) {

        Pageable pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<Contract> result = contractRepository.searchContracts(
                normalizeKeyword(keyword),
                status,
                buildingId,
                pageable
        );

        List<ContractResponse> items = result.getContent()
                .stream()
                .map(contractMapper::toResponse)
                .toList();

        return PageResponse.<ContractResponse>builder()
                .items(items)
                .currentPage(result.getNumber() + 1)
                .totalItems(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .pageSize(result.getSize())
                .build();
    }

    // =====================================================
    // 5. XÓA MỀM HỢP ĐỒNG
    // =====================================================

    @Override
    @Transactional
    public void deleteContract(Long contractId) {
        Contract contract = getContract(contractId);

        // Chỉ cho phép xóa hợp đồng DRAFT.
        if (contract.getStatus() != ContractStatus.DRAFT) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_STATUS);
        }

        Room room = contract.getRoom();

        // Xóa mềm hợp đồng.
        contract.setDeleted(true);
        contractRepository.save(contract);

        // Xóa mềm danh sách người thuê.
        List<ContractTenant> links =
                contractTenantRepository.findByContractIdAndDeletedFalse(
                        contractId
                );

        for (ContractTenant link : links) {
            link.setDeleted(true);
            link.setMoveOutDate(LocalDate.now(VIETNAM_ZONE));
        }

        contractTenantRepository.saveAll(links);

        // Nếu phòng đang RESERVED và không còn hợp đồng ACTIVE/DRAFT,
        // đưa phòng về AVAILABLE.
        boolean hasOtherContract =
                contractRepository.existsByRoomIdAndDeletedFalseAndStatusIn(
                        room.getId(),
                        List.of(
                                ContractStatus.ACTIVE,
                                ContractStatus.DRAFT
                        )
                );

        if (!hasOtherContract && room.getStatus() == RoomStatus.RESERVED) {
            room.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(room);
        }
    }

    // =====================================================
    // 6. CHẤM DỨT HỢP ĐỒNG
    // =====================================================

    @Override
    public ContractDetailResponse terminateContract(
            Long contractId,
            ContractTerminationRequest request
    ) {
        Contract contract = getContract(contractId);

        // Kiểm tra hợp đồng có đang hoạt động hay không
        // Chỉ cho phép chấm dứt hợp đồng đang ở trạng thái ACTIVE
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_STATUS);
        }

        // Kiểm tra yêu cầu chấm dứt hợp đồng và lý do chấm dứt
        // Lý do không được để trống hoặc chỉ chứa khoảng trắng
        if (request == null
                || request.getTerminationReason() == null
                || request.getTerminationReason().isBlank()) {
            throw new AppException(
                    ErrorCode.CONTRACT_INVALID_TERMINATION_REASON
            );
        }

        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        // Cập nhật trạng thái hợp đồng thành đã chấm dứt
        contract.setStatus(ContractStatus.TERMINATED);
        contract.setActualEndDate(today);
        contract.setTerminationReason(
                request.getTerminationReason().trim()
        );

        // Lấy danh sách người thuê thuộc hợp đồng
        List<ContractTenant> links =
                contractTenantRepository.findByContractIdAndDeletedFalse(contractId);

        for (ContractTenant link : links) {
            // Cập nhật ngày chuyển đi
            if (link.getMoveOutDate() == null) {
                link.setMoveOutDate(today);
            }

            // Cập nhật trạng thái thuê của khách
            Tenant tenant = link.getTenant();

            if (tenant != null) {
                tenant.setRentalStatus(TenantRentalStatus.RETURNED);
                tenantRepository.save(tenant);
            }
        }

// Lưu thông tin người thuê thuộc hợp đồng
        contractTenantRepository.saveAll(links);

        Contract savedContract = contractRepository.save(contract);

        Room room = contract.getRoom();
        // Nếu hợp đồng có liên kết với phòng
        if (room != null) {
            // Cập nhật trạng thái phòng thành AVAILABLE (phòng trống)
            room.setStatus(RoomStatus.AVAILABLE);
            roomRepository.save(room);
        }

        return contractMapper.toDetailResponse(savedContract);
    }

    // =====================================================
    // 7. GIA HẠN HỢP ĐỒNG
    // =====================================================

    @Override
    public ContractDetailResponse extendContract(
            Long contractId,
            ContractExtensionRequest request
    ) {
        Contract contract = getContract(contractId);

        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_STATUS);
        }

        if (request == null
                || request.getNewEndDate() == null
                || !request.getNewEndDate().isAfter(contract.getEndDate())) {
            throw new AppException(
                    ErrorCode.CONTRACT_INVALID_EXTENSION_DATE
            );
        }

        LocalDate newEndDate = request.getNewEndDate();

        // Kiểm tra phòng trong toàn bộ thời gian sau khi gia hạn.
        validateRoomAvailable(
                contract.getRoom().getId(),
                contract.getStartDate(),
                newEndDate,
                contractId
        );

        // Kiểm tra người thuê trong toàn bộ thời gian sau khi gia hạn.
        validateContractTenantsAvailable(
                contract,
                contract.getStartDate(),
                newEndDate
        );

        if (request.getRentPrice() != null) {
            validateRentPrice(request.getRentPrice());
            contract.setRentPrice(request.getRentPrice());
        }

        contract.setEndDate(newEndDate);

        if (request.getNotes() != null
                && !request.getNotes().isBlank()) {
            String currentNotes = contract.getNotes();

            contract.setNotes(
                    currentNotes == null || currentNotes.isBlank()
                            ? request.getNotes().trim()
                            : currentNotes + "\n" + request.getNotes().trim()
            );
        }

        Contract savedContract = contractRepository.save(contract);

        return contractMapper.toDetailResponse(savedContract);
    }

    // =====================================================
    // 7.1 THÊM NGƯỜI Ở CÙNG (HỢP ĐỒNG ĐANG HIỆU LỰC)
    // =====================================================

    @Override
    public ContractDetailResponse addCoTenant(
            Long contractId,
            ContractCoTenantRequest request
    ) {
        Contract contract = getContract(contractId);
        requireActive(contract);

        if (request == null || request.getTenantId() == null) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_TENANTS);
        }

        LocalDate today = LocalDate.now(VIETNAM_ZONE);

        LocalDate moveInDate = request.getMoveInDate() == null
                ? today
                : request.getMoveInDate();

        // Ngày vào ở phải nằm trong khoảng từ ngày bắt đầu hợp đồng đến hôm nay.
        if (moveInDate.isBefore(contract.getStartDate())
                || moveInDate.isAfter(today)) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_DATES);
        }

        Tenant tenant = getTenant(request.getTenantId());

        List<ContractTenant> links =
                contractTenantRepository.findByContractIdAndDeletedFalse(
                        contractId
                );

        ContractTenant oldLink = links.stream()
                .filter(link -> link.getTenant().getId().equals(tenant.getId()))
                .findFirst()
                .orElse(null);

        // Đang ở trong hợp đồng này rồi.
        if (oldLink != null && oldLink.getMoveOutDate() == null) {
            throw new AppException(ErrorCode.CONTRACT_DUPLICATE_TENANTS);
        }

        // Không được đang thuộc hợp đồng ACTIVE/DRAFT khác trùng thời gian.
        boolean overlapping =
                contractRepository.existsOverlappingTenantContract(
                        tenant.getId(),
                        BLOCKING_STATUSES,
                        moveInDate,
                        contract.getEndDate(),
                        contractId
                );

        if (overlapping) {
            throw new AppException(ErrorCode.CONTRACT_TENANT_OVERLAPPING);
        }

        // Không vượt quá số người tối đa của phòng.
        long currentCount = links.stream()
                .filter(link -> link.getMoveOutDate() == null)
                .count();

        Integer maxOccupancy = contract.getRoom().getMaxOccupancy();

        if (maxOccupancy != null && currentCount + 1 > maxOccupancy) {
            throw new AppException(ErrorCode.ROOM_MAX_OCCUPANCY_EXCEEDED);
        }

        if (oldLink != null) {
            // Người từng ở rồi chuyển đi, nay quay lại: dùng lại liên kết cũ
            // để không vi phạm ràng buộc unique (hợp đồng, khách).
            oldLink.setMoveOutDate(null);
            oldLink.setIsPrimary(false);
            oldLink.setMoveInDate(moveInDate);
            contractTenantRepository.save(oldLink);
        } else {
            ContractTenant link = new ContractTenant();
            link.setContract(contract);
            link.setTenant(tenant);
            link.setIsPrimary(false);
            link.setMoveInDate(moveInDate);
            contractTenantRepository.save(link);

            if (contract.getContractTenants() == null) {
                contract.setContractTenants(new ArrayList<>());
            }
            contract.getContractTenants().add(link);
        }

        tenant.setRentalStatus(TenantRentalStatus.RENTING);
        tenantRepository.save(tenant);

        return contractMapper.toDetailResponse(contract);
    }

    // =====================================================
    // 7.2 BỚT NGƯỜI Ở CÙNG (HỢP ĐỒNG ĐANG HIỆU LỰC)
    // =====================================================

    @Override
    public ContractDetailResponse removeCoTenant(
            Long contractId,
            Long tenantId,
            LocalDate moveOutDate
    ) {
        Contract contract = getContract(contractId);
        requireActive(contract);

        List<ContractTenant> links =
                contractTenantRepository.findByContractIdAndDeletedFalse(
                        contractId
                );

        ContractTenant link = links.stream()
                .filter(item -> item.getTenant().getId().equals(tenantId)
                        && item.getMoveOutDate() == null)
                .findFirst()
                .orElseThrow(() ->
                        new AppException(ErrorCode.CONTRACT_TENANT_NOT_FOUND)
                );

        // Người đứng tên chính không được bớt, phải chấm dứt hợp đồng.
        if (Boolean.TRUE.equals(link.getIsPrimary())) {
            throw new AppException(
                    ErrorCode.CONTRACT_CANNOT_REMOVE_PRIMARY_TENANT
            );
        }

        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        LocalDate outDate = moveOutDate == null ? today : moveOutDate;

        if (outDate.isAfter(today)
                || (link.getMoveInDate() != null
                && outDate.isBefore(link.getMoveInDate()))) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_DATES);
        }

        // Giữ lại liên kết để làm lịch sử, chỉ ghi ngày chuyển đi.
        link.setMoveOutDate(outDate);
        contractTenantRepository.save(link);

        // Chỉ chuyển sang RETURNED nếu người này không còn ở hợp đồng ACTIVE khác.
        Tenant tenant = link.getTenant();

        boolean stillRenting =
                contractRepository.existsOverlappingTenantContract(
                        tenant.getId(),
                        List.of(ContractStatus.ACTIVE),
                        today,
                        today,
                        contractId
                );

        if (!stillRenting) {
            tenant.setRentalStatus(TenantRentalStatus.RETURNED);
            tenantRepository.save(tenant);
        }

        return contractMapper.toDetailResponse(contract);
    }

    // =====================================================
    // 7.3 THÊM DỊCH VỤ (HỢP ĐỒNG ĐANG HIỆU LỰC)
    // =====================================================

    @Override
    public ContractDetailResponse addService(
            Long contractId,
            ContractServiceRequest request
    ) {
        Contract contract = getContract(contractId);
        requireActive(contract);

        if (request == null || request.getServiceId() == null) {
            throw new AppException(ErrorCode.CONTRACT_SERVICE_NOT_FOUND);
        }

        if (request.getUnitPrice() == null
                || request.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_SERVICE_PRICE);
        }

        // Dịch vụ đã có trong hợp đồng thì dùng chức năng đổi đơn giá.
        boolean exists = contractServiceItemRepository
                .findByContract_IdAndServiceItem_Id(
                        contractId,
                        request.getServiceId()
                )
                .isPresent();

        if (exists) {
            throw new AppException(ErrorCode.CONTRACT_SERVICE_DUPLICATE);
        }

        List<ContractServiceItem> created =
                createContractServices(contract, List.of(request));

        contractServiceItemRepository.saveAll(created);

        if (contract.getContractServices() == null) {
            contract.setContractServices(new ArrayList<>());
        }
        contract.getContractServices().addAll(created);

        return contractMapper.toDetailResponse(contract);
    }

    // =====================================================
    // 7.4 BỎ DỊCH VỤ (HỢP ĐỒNG ĐANG HIỆU LỰC)
    // =====================================================

    @Override
    public ContractDetailResponse removeService(
            Long contractId,
            Long contractServiceId
    ) {
        Contract contract = getContract(contractId);
        requireActive(contract);

        // contractServiceId là id dòng dịch vụ của hợp đồng (ContractServiceItem)
        ContractServiceItem item =
                contractServiceItemRepository.findById(contractServiceId)
                        .filter(found -> found.getContract() != null
                                && found.getContract().getId()
                                .equals(contractId))
                        .orElseThrow(() ->
                                new AppException(
                                        ErrorCode.CONTRACT_SERVICE_NOT_FOUND
                                )
                        );

        // Dịch vụ bắt buộc (điện, nước, mặc định) không được bỏ.
        if (!ContractServiceRules.isRemovable(item)) {
            throw new AppException(ErrorCode.CONTRACT_SERVICE_REQUIRED);
        }

        if (contract.getContractServices() != null) {
            contract.getContractServices().remove(item);
        }

        // Hóa đơn đã tạo giữ nguyên, từ kỳ sau không tính dịch vụ này nữa.
        contractServiceItemRepository.delete(item);

        return contractMapper.toDetailResponse(contract);
    }

    private void requireActive(Contract contract) {
        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_STATUS);
        }
    }

    // =====================================================
    // 8. XUẤT PDF
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public ContractPdfFile exportContractPdf(Long contractId) {
        Contract contract = getContract(contractId);

        // Dựng dữ liệu trong transaction vì phải đọc các quan hệ LAZY
        // (người thuê, dịch vụ, tòa nhà), sau đó mới điền mẫu và xuất PDF
        ContractPdfData data = pdfDataFactory.create(contract);
        byte[] content = pdfRenderer.render(data);

        return new ContractPdfFile(
                "hop-dong-" + contract.getContractCode() + ".pdf",
                content
        );
    }

    // =====================================================
    // 9. DANH SÁCH HỢP ĐỒNG CHO SELECT
    // =====================================================

    @Override
    @Transactional(readOnly = true)
    public List<ContractResponse> getContractOptions(String keyword) {
        return contractRepository.findContractOptions(
                        ContractStatus.ACTIVE,
                        normalizeKeyword(keyword)
                )
                .stream()
                .map(contractMapper::toResponse)
                .toList();
    }

    @Override
    public ContractDashboardResponse getContractDashboard() {

        LocalDate today = LocalDate.now(
                ZoneId.of("Asia/Ho_Chi_Minh")
        );

        LocalDate endDate = today.plusDays(30);

        long totalContracts =
                contractRepository.countByDeletedFalse();

        long activeContracts =
                contractRepository.countByStatusAndDeletedFalse(
                        ContractStatus.ACTIVE
                );

        long draftContracts =
                contractRepository.countByStatusAndDeletedFalse(
                        ContractStatus.DRAFT
                );

        long expiringContracts =
                contractRepository.countExpiringContracts(
                        ContractStatus.ACTIVE,
                        today,
                        endDate
                );

        return new ContractDashboardResponse(
                totalContracts,
                activeContracts,
                draftContracts,
                expiringContracts
        );
    }

    // =====================================================
    // 10. LẤY DỮ LIỆU
    // =====================================================

    private Contract getContract(Long contractId) {
        return contractRepository.findByIdAndDeletedFalse(contractId)
                .orElseThrow(() ->
                        new AppException(ErrorCode.CONTRACT_NOT_FOUND)
                );
    }

    private Room getRoom(Long roomId) {
        Room room = roomRepository.findActiveRoomById(roomId)
                .orElseThrow(() ->
                        new AppException(ErrorCode.ROOM_NOT_FOUND)
                );

        if (room.getBuilding() == null
                || Boolean.TRUE.equals(room.getBuilding().getDeleted())) {
            throw new AppException(ErrorCode.BUILDING_NOT_FOUND);
        }

        return room;
    }

    private Tenant getTenant(Long tenantId) {
        return tenantRepository.findByIdAndDeletedFalse(tenantId)
                .orElseThrow(() ->
                        new AppException(ErrorCode.TENANT_NOT_FOUND)
                );
    }

    // =====================================================
    // 11. KIỂM TRA DỮ LIỆU
    // =====================================================

    private void validateDates(
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (startDate == null
                || endDate == null
                || !endDate.isAfter(startDate)) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_DATES);
        }
    }

    private void validateRentPrice(BigDecimal rentPrice) {
        if (rentPrice == null
                || rentPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.CONTRACT_INVALID_RENT_PRICE);
        }
    }

    /**
     * Kiểm tra phòng có hợp đồng ACTIVE hoặc DRAFT trùng thời gian.
     */
    private void validateRoomAvailable(
            Long roomId,
            LocalDate startDate,
            LocalDate endDate,
            Long excludeContractId
    ) {
        boolean overlapping = contractRepository.existsOverlappingContract(
                roomId,
                BLOCKING_STATUSES,
                startDate,
                endDate,
                excludeContractId
        );

        if (overlapping) {
            throw new AppException(ErrorCode.CONTRACT_ROOM_OVERLAPPING);
        }
    }

    /**
     * Kiểm tra người đứng tên và những người ở cùng có hợp đồng
     * ACTIVE hoặc DRAFT trùng thời gian.
     */
    private void validateTenantsAvailable(
            ContractRequest request,
            Long excludeContractId
    ) {
        if (request.getPrimaryTenantId() == null) {
            throw new AppException(
                    ErrorCode.CONTRACT_INVALID_PRIMARY_TENANT
            );
        }

        Set<Long> tenantIds = new HashSet<>();
        tenantIds.add(request.getPrimaryTenantId());

        List<Long> coTenantIds = request.getCoTenantIds();

        if (coTenantIds != null) {
            for (Long tenantId : coTenantIds) {
                if (tenantId == null) {
                    throw new AppException(
                            ErrorCode.CONTRACT_INVALID_TENANTS
                    );
                }

                if (!tenantIds.add(tenantId)) {
                    if (tenantId.equals(request.getPrimaryTenantId())) {
                        throw new AppException(
                                ErrorCode.CONTRACT_INVALID_PRIMARY_TENANT
                        );
                    }

                    throw new AppException(
                            ErrorCode.CONTRACT_DUPLICATE_TENANTS
                    );
                }
            }
        }

        for (Long tenantId : tenantIds) {
            boolean overlapping =
                    contractRepository.existsOverlappingTenantContract(
                            tenantId,
                            BLOCKING_STATUSES,
                            request.getStartDate(),
                            request.getEndDate(),
                            excludeContractId
                    );

            if (overlapping) {
                throw new AppException(
                        ErrorCode.CONTRACT_TENANT_OVERLAPPING
                );
            }
        }
    }

    /**
     * Kiểm tra thành viên hiện tại khi gia hạn hợp đồng.
     */
    private void validateContractTenantsAvailable(
            Contract contract,
            LocalDate startDate,
            LocalDate endDate
    ) {
        List<ContractTenant> links =
                contractTenantRepository.findByContractIdAndDeletedFalse(
                        contract.getId()
                );

        for (ContractTenant link : links) {
            if (link.getMoveOutDate() != null) {
                continue;
            }

            Long tenantId = link.getTenant().getId();

            boolean overlapping =
                    contractRepository.existsOverlappingTenantContract(
                            tenantId,
                            BLOCKING_STATUSES,
                            startDate,
                            endDate,
                            contract.getId()
                    );

            if (overlapping) {
                throw new AppException(
                        ErrorCode.CONTRACT_TENANT_OVERLAPPING
                );
            }
        }
    }

    // =====================================================
    // 12. TIỆN ÍCH
    // =====================================================

    private String generateContractCode() {
        String date = LocalDate.now(VIETNAM_ZONE)
                .format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        String prefix = "HD" + date;
        String code;
        long count = contractRepository.countByContractCodeStartingWith(prefix);

        do {
            count++;
            code = prefix + String.format("%04d", count);
        } while (contractRepository.existsByContractCode(code));

        return code;
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }

        return keyword.trim();
    }

    /**
     * Lấy danh sách người ở cùng, không bao gồm người đứng tên chính.
     */
    private List<Tenant> getContractTenants(ContractRequest request) {
        List<Long> tenantIds = request.getCoTenantIds();

        if (request.getPrimaryTenantId() == null) {
            throw new AppException(
                    ErrorCode.CONTRACT_INVALID_PRIMARY_TENANT
            );
        }

        if (tenantIds == null) {
            tenantIds = List.of();
        }

        if (tenantIds.stream().anyMatch(Objects::isNull)) {
            throw new AppException(
                    ErrorCode.CONTRACT_INVALID_TENANTS
            );
        }

        if (tenantIds.stream().distinct().count() != tenantIds.size()) {
            throw new AppException(
                    ErrorCode.CONTRACT_DUPLICATE_TENANTS
            );
        }

        if (tenantIds.contains(request.getPrimaryTenantId())) {
            throw new AppException(
                    ErrorCode.CONTRACT_INVALID_PRIMARY_TENANT
            );
        }

        getTenant(request.getPrimaryTenantId());

        return tenantIds.stream()
                .map(this::getTenant)
                .toList();
    }


    private List<ContractServiceItem> createContractServices(
            Contract contract,
            List<ContractServiceRequest> services
    ) {
        if (services == null || services.isEmpty()) {
            return new ArrayList<>();
        }

        // Lấy danh sách ID dịch vụ được chọn
        List<Long> serviceIds = services.stream()
                .map(ContractServiceRequest::getServiceId)
                .toList();

        // Kiểm tra ID dịch vụ bị trùng
        Set<Long> uniqueIds = new HashSet<>(serviceIds);

        if (uniqueIds.size() != serviceIds.size()) {
            throw new AppException(ErrorCode.CONTRACT_SERVICE_DUPLICATE);
        }

        // Lấy danh sách dịch vụ từ database
        List<ServiceItem> serviceItems =
                serviceItemRepository.findAllById(uniqueIds);

        if (serviceItems.size() != uniqueIds.size()) {
            throw new AppException(ErrorCode.CONTRACT_SERVICE_NOT_FOUND);
        }

        // Ánh xạ dịch vụ theo ID
        Map<Long, ServiceItem> serviceItemMap = serviceItems.stream()
                .collect(Collectors.toMap(
                        ServiceItem::getId,
                        serviceItem -> serviceItem
                ));

        List<ContractServiceItem> contractServices = new ArrayList<>();

        for (ContractServiceRequest request : services) {
            ServiceItem service = serviceItemMap.get(request.getServiceId());

            ContractServiceItem item = ContractServiceItem.builder()
                    .contract(contract)
                    .serviceItem(service)
                    .serviceName(service.getName())
                    .unitPrice(request.getUnitPrice())
                    .unit(service.getUnit())
                    .build();

            contractServices.add(item);
        }

        return contractServices;
    }

}