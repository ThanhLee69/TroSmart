package com.project.trosmart.util;

import com.project.trosmart.entity.Amenity;
import com.project.trosmart.entity.Building;
import com.project.trosmart.entity.Room;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Tính độ tương tự giữa hai phòng (0 đến 1), dùng cho mục "Phòng tương tự".
 *
 * Điểm = tổng có trọng số của 5 tiêu chí, mỗi tiêu chí đã chuẩn hóa về 0..1:
 *   giá 35% | vị trí 25% | diện tích 15% | tiện nghi 15% | loại phòng 10%
 */
public final class RoomSimilarity {

    public static final double W_PRICE = 0.35;
    public static final double W_LOCATION = 0.25;
    public static final double W_AREA = 0.15;
    public static final double W_AMENITY = 0.15;
    public static final double W_TYPE = 0.10;

    // Cách nhau từ ngần này km trở lên thì điểm vị trí về 0
    public static final double MAX_DISTANCE_KM = 5.0;

    private static final double EARTH_RADIUS_KM = 6371.0;

    private RoomSimilarity() {
    }

    public static double score(Room base, Room other) {
        return W_PRICE * priceScore(base, other)
                + W_LOCATION * locationScore(base.getBuilding(), other.getBuilding())
                + W_AREA * areaScore(base, other)
                + W_AMENITY * amenityScore(base, other)
                + W_TYPE * typeScore(base, other);
    }

    // 1 - |chênh lệch| / giá phòng đang xem; chênh quá 100% thì về 0
    static double priceScore(Room a, Room b) {
        return closeness(a.getRentalPrice(), b.getRentalPrice(), 0.0);
    }

    // Thiếu diện tích thì cho điểm trung tính 0.5 để không phạt oan
    static double areaScore(Room a, Room b) {
        return closeness(a.getArea(), b.getArea(), 0.5);
    }

    private static double closeness(BigDecimal base, BigDecimal other, double missing) {
        if (base == null || other == null || base.signum() <= 0) {
            return missing;
        }

        double ratio = Math.abs(other.doubleValue() - base.doubleValue())
                / base.doubleValue();

        return Math.max(0.0, 1.0 - ratio);
    }

    // Cùng tòa nhà = 1. Khác tòa: có tọa độ thì giảm dần theo km (Haversine),
    // không có tọa độ thì so khu vực (cùng phường 0.6, cùng tỉnh 0.3).
    static double locationScore(Building a, Building b) {
        if (a == null || b == null) {
            return 0.0;
        }

        if (a.getId() != null && a.getId().equals(b.getId())) {
            return 1.0;
        }

        if (a.getLatitude() != null && a.getLongitude() != null
                && b.getLatitude() != null && b.getLongitude() != null) {
            double km = haversineKm(
                    a.getLatitude().doubleValue(), a.getLongitude().doubleValue(),
                    b.getLatitude().doubleValue(), b.getLongitude().doubleValue()
            );

            return Math.max(0.0, 1.0 - km / MAX_DISTANCE_KM);
        }

        if (sameText(a.getProvince(), b.getProvince())) {
            return sameText(a.getWard(), b.getWard()) ? 0.6 : 0.3;
        }

        return 0.0;
    }

    // Jaccard: số tiện nghi chung / tổng số tiện nghi khác nhau của hai phòng.
    // Cả hai đều không có tiện nghi thì điểm trung tính 0.5.
    static double amenityScore(Room a, Room b) {
        Set<Long> x = amenityIds(a);
        Set<Long> y = amenityIds(b);

        if (x.isEmpty() && y.isEmpty()) {
            return 0.5;
        }

        Set<Long> common = new HashSet<>(x);
        common.retainAll(y);

        Set<Long> all = new HashSet<>(x);
        all.addAll(y);

        return (double) common.size() / all.size();
    }

    static double typeScore(Room a, Room b) {
        return a.getRoomType() != null && a.getRoomType() == b.getRoomType()
                ? 1.0
                : 0.0;
    }

    // Khoảng cách đường chim bay giữa hai tọa độ (km)
    public static double haversineKm(
            double lat1, double lon1, double lat2, double lon2
    ) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1.0, Math.sqrt(h)));
    }

    private static Set<Long> amenityIds(Room room) {
        if (room.getAmenities() == null) {
            return Set.of();
        }

        return room.getAmenities().stream()
                .map(Amenity::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private static boolean sameText(String a, String b) {
        return a != null && b != null && a.trim().equalsIgnoreCase(b.trim());
    }
}