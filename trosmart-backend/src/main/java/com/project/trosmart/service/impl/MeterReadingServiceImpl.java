
package com.project.trosmart.service.impl;

import com.project.trosmart.constants.ErrorCode;
import com.project.trosmart.dto.request.MeterReadingRequest;
import com.project.trosmart.dto.response.*;
        import com.project.trosmart.entity.MeterReading;
import com.project.trosmart.entity.Room;
import com.project.trosmart.enums.MeterReadingStatus;
import com.project.trosmart.exception.AppException;
import com.project.trosmart.mapper.MeterReadingMapper;
import com.project.trosmart.repository.MeterReadingRepository;
import com.project.trosmart.repository.RoomRepository;
import com.project.trosmart.service.MeterReadingService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MeterReadingServiceImpl implements MeterReadingService {

    // Các trạng thái được tính là "đã ghi chỉ số"
    private static final List<MeterReadingStatus> RECORDED_STATUSES =
            List.of(MeterReadingStatus.RECORDED, MeterReadingStatus.INVOICED);

    private final MeterReadingRepository meterReadingRepository;
    private final RoomRepository roomRepository;
    private final MeterReadingMapper meterReadingMapper;

    // =========================================================
    // 1. DANH SÁCH GHI CHỈ SỐ THEO PHÒNG
    // Hiển thị toàn bộ phòng của kỳ; phòng chưa có bản ghi => NOT_RECORDED
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public PageResponse<MeterReadingResponse> getMeterReadings(
            Long buildingId,
            Integer billingMonth,
            Integer billingYear,
            MeterReadingStatus status,
            String keyword,
            int page,
            int size){
        requirePeriod(billingMonth, billingYear);
        validateBuildingId(buildingId);

        Page<Object[]> result = meterReadingRepository.findMeterReadingRooms(
                buildingId,
                billingMonth,
                billingYear,
                status,
                toLikePattern(keyword),
                buildPageable(page, size)
        );
        List<MeterReadingResponse> items = result.getContent().stream()
                .map(row -> toRowResponse(
                        (Room) row[0],
                        (MeterReading) row[1],
                        billingMonth,
                        billingYear
                ))
                .toList();

        return toPageResponse(result, items);
    }

    // =========================================================
    // 2. CHI TIẾT BẢN GHI
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public MeterReadingDetailResponse getMeterReadingById(Long id) {
        return meterReadingMapper.toMeterReadingDetailResponse(getActiveReading(id));
    }

    // =========================================================
    // 3. LỊCH SỬ GHI CHỈ SỐ CỦA 1 PHÒNG
    // Tháng và năm là bộ lọc tùy chọn, có thể dùng riêng từng cái
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public PageResponse<MeterReadingHistoryResponse> getMeterReadingHistory(
            Long roomId,
            Integer billingMonth,
            Integer billingYear,
            int page,
            int size
    ) {
        validateOptionalPeriod(billingMonth, billingYear);
        getActiveRoom(roomId); // đảm bảo phòng tồn tại

        Page<MeterReading> result = meterReadingRepository.findMeterReadingHistory(
                roomId,
                billingMonth,
                billingYear,
                buildPageable(page, size)
        );

        List<MeterReadingHistoryResponse> items = result.getContent().stream()
                .map(meterReadingMapper::toMeterReadingHistoryResponse)
                .toList();

        return toPageResponse(result, items);
    }

    // =========================================================
    // 4. TẠO BẢN GHI ĐIỆN NƯỚC
    // - Nếu client không gửi chỉ số đầu kỳ thì lấy chỉ số cuối kỳ trước
    // - Có đủ chỉ số cuối (điện + nước) => RECORDED, chưa đủ => NOT_RECORDED
    // =========================================================
    @Override
    public MeterReadingResponse createMeterReading(MeterReadingRequest request) {
        validateCreateRequest(request);
        // Không cho tạo bản ghi thuộc kỳ tương lai
        validateNotFuturePeriod(
                request.getBillingMonth(),
                request.getBillingYear()
        );
        Room room = getActiveRoom(request.getRoomId());

        boolean duplicate = meterReadingRepository
                .existsByRoom_IdAndBillingMonthAndBillingYearAndDeletedFalse(
                        request.getRoomId(),
                        request.getBillingMonth(),
                        request.getBillingYear()
                );
        if (duplicate) {
            throw new AppException(ErrorCode.METER_READING_DUPLICATE);
        }

        BigDecimal electricityStart = request.getElectricityStart();
        BigDecimal waterStart = request.getWaterStart();

        // Thiếu chỉ số đầu kỳ => lấy từ kỳ trước
        if (electricityStart == null || waterStart == null) {
            MeterReading previous = findPreviousReading(
                    request.getRoomId(),
                    request.getBillingMonth(),
                    request.getBillingYear()
            );
            if (previous == null) {
                // Phòng chưa có kỳ trước thì bắt buộc nhập chỉ số đầu kỳ
                throw new AppException(ErrorCode.METER_READING_INVALID_INDEX);
            }
            if (electricityStart == null) {
                electricityStart = previous.getElectricityEnd();
            }
            if (waterStart == null) {
                waterStart = previous.getWaterEnd();
            }
        }

        validateIndexes(
                electricityStart,
                request.getElectricityEnd(),
                waterStart,
                request.getWaterEnd()
        );

        MeterReading reading = meterReadingMapper.toMeterReading(request);
        reading.setRoom(room);
        reading.setElectricityStart(electricityStart);
        reading.setWaterStart(waterStart);
        reading.setNote(normalizeNote(reading.getNote()));
        applyStatus(reading);

        try {
            // saveAndFlush để bắt lỗi trùng kỳ do unique constraint (2 request cùng lúc)
            reading = meterReadingRepository.saveAndFlush(reading);
        } catch (DataIntegrityViolationException e) {
            throw new AppException(ErrorCode.METER_READING_DUPLICATE);
        }

        return meterReadingMapper.toMeterReadingResponse(reading);
    }

    // =========================================================
    // 5. CẬP NHẬT BẢN GHI (chỉ khi chưa lập hóa đơn)
    // - Không đổi phòng, không đổi kỳ ghi
    // - Field nào request để null thì giữ nguyên giá trị cũ
    // =========================================================
    @Override
    public MeterReadingResponse updateMeterReading(
            Long id,
            MeterReadingRequest request
    ) {
        if (request == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        MeterReading reading = getActiveReading(id);
        validateNotFuturePeriod(
                reading.getBillingMonth(),
                reading.getBillingYear()
        );

        if (reading.getStatus() == MeterReadingStatus.INVOICED) {
            throw new AppException(ErrorCode.METER_READING_ALREADY_INVOICED);
        }

        // Không cho chuyển bản ghi sang phòng khác
        if (request.getRoomId() != null
                && !reading.getRoom().getId().equals(request.getRoomId())) {
            throw new AppException(ErrorCode.METER_READING_ROOM_MISMATCH);
        }

        // Không cho đổi kỳ ghi (mapper cũng bỏ qua 2 field này)
        if ((request.getBillingMonth() != null
                && !request.getBillingMonth().equals(reading.getBillingMonth()))
                || (request.getBillingYear() != null
                && !request.getBillingYear().equals(reading.getBillingYear()))) {
            throw new AppException(ErrorCode.METER_READING_INVALID_PERIOD);
        }

        validateRecordedDate(request.getRecordedDate());
        // Gộp request vào entity rồi kiểm tra trên giá trị cuối cùng
        // (nếu lỗi, exception làm transaction rollback nên không lưu gì)
        meterReadingMapper.updateMeterReading(reading, request);
        // Chuẩn hóa ghi chú sau khi gộp, để áp dụng cho ghi chú mới từ request
        reading.setNote(normalizeNote(reading.getNote()));

        validateIndexes(
                reading.getElectricityStart(),
                reading.getElectricityEnd(),
                reading.getWaterStart(),
                reading.getWaterEnd()
        );

        applyStatus(reading);

        return meterReadingMapper.toMeterReadingResponse(
                meterReadingRepository.save(reading)
        );
    }


    // =========================================================
    // 7. DASHBOARD ĐIỆN NƯỚC
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public MeterReadingDashboardResponse getMeterReadingDashboard(
            Long buildingId,
            Integer billingMonth,
            Integer billingYear
    ) {
        requirePeriod(billingMonth, billingYear);
        validateBuildingId(buildingId);

        BigDecimal totalElectricity = meterReadingRepository
                .sumElectricityConsumption(
                        buildingId, billingMonth, billingYear, RECORDED_STATUSES);

        BigDecimal totalWater = meterReadingRepository
                .sumWaterConsumption(
                        buildingId, billingMonth, billingYear, RECORDED_STATUSES);

        long recordedRooms = meterReadingRepository
                .countRecordedRooms(
                        buildingId, billingMonth, billingYear, RECORDED_STATUSES);

        long unrecordedRooms = meterReadingRepository
                .countUnrecordedRooms(buildingId, billingMonth, billingYear);

        return MeterReadingDashboardResponse.builder()
                .totalElectricityConsumption(
                        totalElectricity != null ? totalElectricity : BigDecimal.ZERO)
                .totalWaterConsumption(
                        totalWater != null ? totalWater : BigDecimal.ZERO)
                .recordedRooms(recordedRooms)
                .unrecordedRooms(unrecordedRooms)
                .build();
    }

    // =========================================================
    // HÀM PHỤ
    // =========================================================

    // Đặt trạng thái theo dữ liệu: đủ chỉ số cuối điện + nước => RECORDED
    private void applyStatus(MeterReading reading) {
        boolean completed = reading.getElectricityEnd() != null
                && reading.getWaterEnd() != null;

        if (completed) {
            reading.setStatus(MeterReadingStatus.RECORDED);
            if (reading.getRecordedDate() == null) {
                reading.setRecordedDate(LocalDate.now());
            }
        } else {
            reading.setStatus(MeterReadingStatus.NOT_RECORDED);
        }
    }

    // Dòng danh sách: có bản ghi thì map, chưa có thì dựng dòng "chưa ghi" từ phòng
    private MeterReadingResponse toRowResponse(
            Room room,
            MeterReading reading,
            Integer billingMonth,
            Integer billingYear
    ) {
        if (reading != null) {
            return meterReadingMapper.toMeterReadingResponse(reading);
        }

        // Phòng chưa ghi kỳ này: chỉ số đầu kỳ = chỉ số cuối của kỳ gần nhất trước đó
        MeterReading previous = findPreviousReading(
                room.getId(), billingMonth, billingYear);

        return MeterReadingResponse.builder()
                .roomId(room.getId())
                .roomNumber(room.getRoomNumber())
                .buildingName(room.getBuilding().getName())
                .billingMonth(billingMonth)
                .billingYear(billingYear)
                .electricityStart(previous != null ? previous.getElectricityEnd() : null)
                .waterStart(previous != null ? previous.getWaterEnd() : null)
                .electricityConsumption(BigDecimal.ZERO)
                .waterConsumption(BigDecimal.ZERO)
                .status(MeterReadingStatus.NOT_RECORDED)
                .build();
    }

    private MeterReading findPreviousReading(
            Long roomId,
            Integer billingMonth,
            Integer billingYear
    ) {
        return meterReadingRepository
                .findPreviousReadings(
                        roomId, billingMonth, billingYear, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .orElse(null);
    }

    private Room getActiveRoom(Long roomId) {
        if (roomId == null) {
            throw new AppException(ErrorCode.METER_READING_ROOM_REQUIRED);
        }

        Room room = roomRepository.findActiveRoomById(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));

        if (room.getBuilding() == null || room.getBuilding().getDeleted()) {
            throw new AppException(ErrorCode.BUILDING_NOT_FOUND);
        }

        return room;
    }

    // Bản ghi + phòng + tòa nhà đều phải chưa bị xóa (đã lọc trong query)
    private MeterReading getActiveReading(Long id) {
        if (id == null) {
            throw new AppException(ErrorCode.METER_READING_NOT_FOUND);
        }

        return meterReadingRepository.findActiveById(id)
                .orElseThrow(() ->
                        new AppException(ErrorCode.METER_READING_NOT_FOUND));
    }

    // page và size đã được controller validate (page >= 1, 1 <= size <= 100)
    private Pageable buildPageable(int page, int size) {
        return PageRequest.of(page - 1, size);
    }

    private <T> PageResponse<T> toPageResponse(Page<?> page, List<T> items) {
        return PageResponse.<T>builder()
                .items(items)
                .currentPage(page.getNumber() + 1)
                .pageSize(page.getSize())
                .totalItems(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    // =========================================================
    // KIỂM TRA DỮ LIỆU
    // =========================================================

    private void validateBuildingId(Long buildingId) {
        if (buildingId != null && buildingId <= 0) {
            throw new AppException(ErrorCode.BUILDING_NOT_FOUND);
        }
    }

    // Danh sách và dashboard bắt buộc có đủ tháng + năm
    private void requirePeriod(Integer month, Integer year) {
        if (month == null || year == null) {
            throw new AppException(ErrorCode.METER_READING_INVALID_PERIOD);
        }
        validateOptionalPeriod(month, year);
    }

    // Lịch sử: tháng/năm tùy chọn, nhưng nếu có thì phải hợp lệ
    private void validateOptionalPeriod(Integer month, Integer year) {
        if (month != null && (month < 1 || month > 12)) {
            throw new AppException(ErrorCode.METER_READING_INVALID_PERIOD);
        }
        if (year != null && (year < 2000 || year > 2100)) {
            throw new AppException(ErrorCode.METER_READING_INVALID_PERIOD);
        }
    }

    private void validateCreateRequest(MeterReadingRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        if (request.getRoomId() == null) {
            throw new AppException(ErrorCode.METER_READING_ROOM_REQUIRED);
        }
        requirePeriod(request.getBillingMonth(), request.getBillingYear());
        validateRecordedDate(request.getRecordedDate());
    }

    private void validateRecordedDate(LocalDate recordedDate) {
        if (recordedDate != null && recordedDate.isAfter(LocalDate.now())) {
            throw new AppException(ErrorCode.METER_READING_DATE_INVALID);
        }
    }

    // Chỉ số không âm, chỉ số cuối không nhỏ hơn chỉ số đầu
    private void validateIndexes(
            BigDecimal electricityStart,
            BigDecimal electricityEnd,
            BigDecimal waterStart,
            BigDecimal waterEnd
    ) {
        if (electricityStart == null || waterStart == null
                || electricityStart.signum() < 0
                || waterStart.signum() < 0) {
            throw new AppException(ErrorCode.METER_READING_INVALID_INDEX);
        }

        if (electricityEnd != null
                && (electricityEnd.signum() < 0
                || electricityEnd.compareTo(electricityStart) < 0)) {
            throw new AppException(ErrorCode.METER_READING_INVALID_INDEX);
        }

        if (waterEnd != null
                && (waterEnd.signum() < 0
                || waterEnd.compareTo(waterStart) < 0)) {
            throw new AppException(ErrorCode.METER_READING_INVALID_INDEX);
        }
    }
    // Ghi chú trống hoặc toàn khoảng trắng => null
    private String normalizeNote(String note) {
        return note == null || note.isBlank() ? null : note.trim();
    }
    // "a1" -> "%a1%". Bỏ qua hoa thường và escape % _ \ để người dùng gõ ký tự đặc biệt không sai kết quả
    private String toLikePattern(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return "%";
        }
        String escaped = keyword.trim().toLowerCase()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    // Không cho tạo hoặc cập nhật chỉ số của kỳ tương lai
    private void validateNotFuturePeriod(
            Integer billingMonth,
            Integer billingYear
    ) {
        if (billingMonth == null || billingYear == null) {
            throw new AppException(ErrorCode.METER_READING_INVALID_PERIOD);
        }

        YearMonth requestedPeriod = YearMonth.of(billingYear, billingMonth);

        YearMonth currentPeriod = YearMonth.now(
                ZoneId.of("Asia/Ho_Chi_Minh")
        );

        if (requestedPeriod.isAfter(currentPeriod)) {
            throw new AppException(ErrorCode.METER_READING_FUTURE_PERIOD);
        }
    }
}