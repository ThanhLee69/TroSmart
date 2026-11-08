package com.project.trosmart.util;

/**
 * Tính khoảng cách giữa hai tọa độ trên mặt cầu (công thức Haversine).
 */
public final class GeoUtils {

    private static final double EARTH_RADIUS_KM = 6371.0088;
    private static final double KM_PER_DEGREE_LAT = 111.32;

    private GeoUtils() {
    }

    /** Khoảng cách đường chim bay giữa hai điểm, đơn vị km. */
    public static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);

        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Hình chữ nhật bao quanh vòng tròn bán kính radiusKm.
     * Dùng lọc thô ở DB cho nhanh, sau đó mới tính Haversine chính xác.
     * Trả về {minLat, maxLat, minLng, maxLng}.
     */
    public static double[] boundingBox(double lat, double lng, double radiusKm) {
        double dLat = radiusKm / KM_PER_DEGREE_LAT;
        double cos = Math.max(Math.cos(Math.toRadians(lat)), 0.0001);
        double dLng = radiusKm / (KM_PER_DEGREE_LAT * cos);

        return new double[]{lat - dLat, lat + dLat, lng - dLng, lng + dLng};
    }
}