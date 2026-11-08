package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.RoomRequest;
import com.project.trosmart.dto.response.PageResponse;
import com.project.trosmart.dto.response.RoomDashboardResponse;
import com.project.trosmart.dto.response.RoomDetailResponse;
import com.project.trosmart.dto.response.RoomOptionResponse;
import com.project.trosmart.dto.response.RoomResponse;
import com.project.trosmart.entity.Amenity;
import com.project.trosmart.entity.Building;
import com.project.trosmart.entity.Contract;
import com.project.trosmart.entity.ContractTenant;
import com.project.trosmart.entity.Invoice;
import com.project.trosmart.entity.Issue;
import com.project.trosmart.entity.MeterReading;
import com.project.trosmart.entity.Room;
import com.project.trosmart.enums.ContractStatus;
import com.project.trosmart.enums.MeterReadingStatus;
import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.enums.RoomType;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.RoomMapper;
import com.project.trosmart.repository.AmenityRepository;
import com.project.trosmart.repository.BuildingRepository;
import com.project.trosmart.repository.ContractRepository;
import com.project.trosmart.repository.InvoiceRepository;
import com.project.trosmart.repository.IssueRepository;
import com.project.trosmart.repository.MeterReadingRepository;
import com.project.trosmart.repository.RoomRepository;
import com.project.trosmart.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoomServiceImpl implements RoomService {



    private final RoomRepository roomRepository;
    private final RoomMapper roomMapper;
    private final AmenityRepository amenityRepository;
    private final BuildingRepository buildingRepository;
    private final ContractRepository contractRepository;
    private final MeterReadingRepository meterReadingRepository;
    private final InvoiceRepository invoiceRepository;
    private final IssueRepository issueRepository;

    // Số bản ghi liên quan hiển thị ở trang chi tiết phòng
    private static final int DETAIL_INVOICE_LIMIT = 5;
    private static final int DETAIL_ISSUE_LIMIT = 5;

    @Override
    public PageResponse<RoomResponse> getRooms(
            String keyword,
            Long buildingId,
            RoomType roomType,
            RoomStatus status,
            int page,
            int size
    ) {

        Pageable pageable = PageRequest.of(
                page - 1,
                size,
                Sort.by(Sort.Direction.DESC, "id")
        );

        String normalizedKeyword = StringUtils.hasText(keyword)
                ? keyword.trim()
                : null;

        Page<Room> roomPage = roomRepository.searchRooms(
                normalizedKeyword,
                buildingId,
                roomType,
                status,
                pageable
        );

        List<RoomResponse> items = roomPage.getContent()
                .stream()
                .map(roomMapper::toRoomResponse)
                .toList();

        return PageResponse.<RoomResponse>builder()
                .items(items)
                .currentPage(roomPage.getNumber() + 1)
                .pageSize(roomPage.getSize())
                .totalItems(roomPage.getTotalElements())
                .totalPages(roomPage.getTotalPages())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomOptionResponse> getRoomOptions(String keyword) {
        List<Room> rooms = roomRepository.findRoomOptions(keyword);
        return roomMapper.toRoomOptionResponses(rooms);
    }

    @Override
    public RoomDetailResponse getRoomById(Long id) {
        Room room = getActiveRoom(id);
        RoomDetailResponse detail = roomMapper.toRoomDetailResponse(room);

        // ----- Hợp đồng đang hiệu lực và người đang ở -----
        Contract active = contractRepository
                .findByRoomIdAndStatusWithTenants(id, ContractStatus.ACTIVE)
                .stream()
                .findFirst()
                .orElse(null);

        if (active != null) {
            detail.setCurrentContract(toContractInfo(active));

            List<RoomDetailResponse.TenantInfo> tenants = active
                    .getContractTenants()
                    .stream()
                    .filter(ct -> ct.getMoveOutDate() == null)
                    .sorted(Comparator
                            .comparing((ContractTenant ct) ->
                                    !Boolean.TRUE.equals(ct.getIsPrimary()))
                            .thenComparing(ContractTenant::getId))
                    .map(ct -> RoomDetailResponse.TenantInfo.builder()
                            .id(ct.getTenant().getId())
                            .fullName(ct.getTenant().getFullName())
                            .phone(ct.getTenant().getPhone())
                            .isPrimary(Boolean.TRUE.equals(ct.getIsPrimary()))
                            .moveInDate(ct.getMoveInDate())
                            .build())
                    .toList();

            detail.setCurrentTenants(tenants);
        } else {
            detail.setCurrentTenants(List.of());

            contractRepository
                    .findFirstByRoom_IdAndStatusInAndDeletedFalseOrderByEndDateDesc(
                            id,
                            List.of(
                                    ContractStatus.EXPIRED,
                                    ContractStatus.TERMINATED
                            )
                    )
                    .ifPresent(c -> detail.setLastContract(toContractInfo(c)));
        }

        // ----- Điện nước gần nhất -----
        meterReadingRepository
                .findFirstByRoom_IdAndStatusNotAndDeletedFalseOrderByBillingYearDescBillingMonthDesc(
                        id,
                        MeterReadingStatus.NOT_RECORDED
                )
                .ifPresent(m -> detail.setLatestMeterReading(toMeterInfo(m)));

        // ----- Hóa đơn gần đây và công nợ -----
        List<RoomDetailResponse.InvoiceInfo> invoices = invoiceRepository
                .findRecentByRoomId(id, PageRequest.of(0, DETAIL_INVOICE_LIMIT))
                .stream()
                .map(this::toInvoiceInfo)
                .toList();

        detail.setRecentInvoices(invoices);
        detail.setUnpaidTotal(invoiceRepository.sumUnpaidByRoomId(id));

        // ----- Yêu cầu sửa chữa gần đây -----
        List<RoomDetailResponse.IssueInfo> issues = issueRepository
                .findByRoom_IdAndDeletedFalseOrderByCreatedAtDesc(
                        id,
                        PageRequest.of(0, DETAIL_ISSUE_LIMIT)
                )
                .stream()
                .map(this::toIssueInfo)
                .toList();

        detail.setRecentIssues(issues);

        return detail;
    }

    @Override
    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        Building building = getBuilding(request.getBuildingId());

        validateDuplicateRoomNumber(
                building.getId(),
                request.getRoomNumber(),
                null
        );

        Set<Amenity> amenities = getAmenities(request.getAmenityIds());

        Room room = roomMapper.toRoom(request);
        room.setBuilding(building);
        room.setAmenities(amenities);
        room.setStatus(RoomStatus.AVAILABLE);
        room.setDeleted(false);

        Room savedRoom = roomRepository.save(room);

        return roomMapper.toRoomResponse(savedRoom);
    }

    @Override
    @Transactional
    public RoomResponse updateRoom(Long id, RoomRequest request) {
        Room room = getActiveRoom(id);
        Building building = getBuilding(request.getBuildingId());

        validateDuplicateRoomNumber(
                building.getId(),
                request.getRoomNumber(),
                room.getId()
        );

        Set<Amenity> amenities = getAmenities(request.getAmenityIds());

        roomMapper.updateRoom(room, request);
        room.setBuilding(building);
        room.setAmenities(amenities);

        Room updatedRoom = roomRepository.save(room);

        return roomMapper.toRoomResponse(updatedRoom);
    }

    @Override
    @Transactional
    public void deleteRoom(Long id) {
        Room room = getActiveRoom(id);

        // Phòng đang có hợp đồng hiệu lực (hoặc đang có người thuê) thì không được xóa
        boolean hasActiveContract = contractRepository
                .existsByRoom_IdAndStatusAndDeletedFalse(id, ContractStatus.ACTIVE);

        if (hasActiveContract || room.getStatus() == RoomStatus.OCCUPIED) {
            throw new AppException(ErrorCode.ROOM_HAS_ACTIVE_CONTRACT);
        }

        // Phòng đã được đặt trước thì không được xóa
        if (room.getStatus() == RoomStatus.RESERVED) {
            throw new AppException(ErrorCode.ROOM_RESERVED_CANNOT_DELETE);
        }

        room.setDeleted(true);
        roomRepository.save(room);
    }

    @Override
    @Transactional
    public RoomResponse updateRoomMaintenance(Long id, boolean enabled) {
        Room room = getActiveRoom(id);

        if (enabled) {
            // Khóa: chỉ phòng đang trống mới khóa được
            if (room.getStatus() != RoomStatus.AVAILABLE) {
                throw new AppException(ErrorCode.ROOM_CANNOT_START_MAINTENANCE);
            }
            room.setStatus(RoomStatus.MAINTENANCE);
        } else {
            // Mở lại: chỉ phòng đang bảo trì, xong thì về trống
            if (room.getStatus() != RoomStatus.MAINTENANCE) {
                throw new AppException(ErrorCode.ROOM_NOT_IN_MAINTENANCE);
            }
            room.setStatus(RoomStatus.AVAILABLE);
        }

        return roomMapper.toRoomResponse(roomRepository.save(room));
    }

    @Override
    public RoomDashboardResponse getRoomDashboard(Long buildingId) {
        long totalRooms;
        long availableRooms;
        long occupiedRooms;
        long maintenanceRooms;

        if (buildingId == null) {
            totalRooms = roomRepository.countByDeletedFalse();

            availableRooms = roomRepository.countByStatusAndDeletedFalse(
                    RoomStatus.AVAILABLE
            );

            occupiedRooms = roomRepository.countByStatusAndDeletedFalse(
                    RoomStatus.OCCUPIED
            );

            maintenanceRooms = roomRepository.countByStatusAndDeletedFalse(
                    RoomStatus.MAINTENANCE
            );
        } else {
            getBuilding(buildingId);

            totalRooms = roomRepository
                    .countByBuilding_IdAndDeletedFalse(buildingId);

            availableRooms = roomRepository
                    .countByBuilding_IdAndStatusAndDeletedFalse(
                            buildingId,
                            RoomStatus.AVAILABLE
                    );

            occupiedRooms = roomRepository
                    .countByBuilding_IdAndStatusAndDeletedFalse(
                            buildingId,
                            RoomStatus.OCCUPIED
                    );

            maintenanceRooms = roomRepository
                    .countByBuilding_IdAndStatusAndDeletedFalse(
                            buildingId,
                            RoomStatus.MAINTENANCE
                    );
        }

        double occupancyRate = totalRooms == 0
                ? 0.0
                : Math.round(occupiedRooms * 10000.0 / totalRooms) / 100.0;

        return RoomDashboardResponse.builder()
                .totalRooms(totalRooms)
                .occupiedRooms(occupiedRooms)
                .availableRooms(availableRooms)
                .maintenanceRooms(maintenanceRooms)
                .occupancyRate(occupancyRate)
                .build();
    }


    private RoomDetailResponse.ContractInfo toContractInfo(Contract c) {
        return RoomDetailResponse.ContractInfo.builder()
                .id(c.getId())
                .contractCode(c.getContractCode())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .actualEndDate(c.getActualEndDate())
                .rentPrice(c.getRentPrice())
                .deposit(c.getDeposit())
                .paymentDueDay(c.getPaymentDueDay())
                .build();
    }

    private RoomDetailResponse.MeterInfo toMeterInfo(MeterReading m) {
        return RoomDetailResponse.MeterInfo.builder()
                .billingMonth(m.getBillingMonth())
                .billingYear(m.getBillingYear())
                .electricityStart(m.getElectricityStart())
                .electricityEnd(m.getElectricityEnd())
                .waterStart(m.getWaterStart())
                .waterEnd(m.getWaterEnd())
                .recordedDate(m.getRecordedDate())
                .build();
    }

    private RoomDetailResponse.InvoiceInfo toInvoiceInfo(Invoice i) {
        return RoomDetailResponse.InvoiceInfo.builder()
                .id(i.getId())
                .invoiceCode(i.getInvoiceCode())
                .billingMonth(i.getBillingMonth())
                .billingYear(i.getBillingYear())
                .totalAmount(i.getTotalAmount())
                .remainingAmount(i.getRemainingAmount())
                .status(i.getStatus().name())
                .dueDate(i.getDueDate())
                .build();
    }

    private RoomDetailResponse.IssueInfo toIssueInfo(Issue i) {
        return RoomDetailResponse.IssueInfo.builder()
                .id(i.getId())
                .title(i.getTitle())
                .status(i.getStatus().name())
                .tenantName(i.getTenant() != null ? i.getTenant().getFullName() : null)
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .build();
    }

    private Room getActiveRoom(Long id) {
        return roomRepository.findActiveRoomById(id)
                .orElseThrow(() ->
                        new AppException(ErrorCode.ROOM_NOT_FOUND)
                );
    }

    private Building getBuilding(Long buildingId) {
        return buildingRepository.findById(buildingId)
                .orElseThrow(() ->
                        new AppException(ErrorCode.BUILDING_NOT_FOUND)
                );
    }

    private Set<Amenity> getAmenities(Set<Long> amenityIds) {
        if (amenityIds == null || amenityIds.isEmpty()) {
            return new HashSet<>();
        }

        Set<Long> validIds = amenityIds.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (validIds.size() != amenityIds.size()) {
            throw new AppException(ErrorCode.AMENITY_NOT_FOUND);
        }

        List<Amenity> foundAmenities =
                amenityRepository.findAllById(validIds);

        if (foundAmenities.size() != validIds.size()) {
            throw new AppException(ErrorCode.AMENITY_NOT_FOUND);
        }

        return new HashSet<>(foundAmenities);
    }

    private void validateDuplicateRoomNumber(
            Long buildingId,
            String roomNumber,
            Long currentRoomId
    ) {
        boolean duplicated;

        if (currentRoomId == null) {
            duplicated =
                    roomRepository
                            .existsByBuilding_IdAndRoomNumberIgnoreCaseAndDeletedFalse(
                                    buildingId,
                                    roomNumber.trim()
                            );
        } else {
            duplicated = roomRepository.existsDuplicateRoomNumber(
                    buildingId,
                    roomNumber.trim(),
                    currentRoomId
            );
        }

        if (duplicated) {
            throw new AppException(
                    ErrorCode.ROOM_NUMBER_ALREADY_EXISTS
            );
        }
    }
}