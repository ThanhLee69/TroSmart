package com.project.trosmart.repository.specification;

import com.project.trosmart.dto.request.PublicRoomSearchRequest;
import com.project.trosmart.entity.Amenity;
import com.project.trosmart.entity.Building;
import com.project.trosmart.entity.Room;
import com.project.trosmart.enums.RoomStatus;
import com.project.trosmart.util.GeoUtils;
import com.project.trosmart.util.LocationNames;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class RoomSpecifications {

    private RoomSpecifications() {
    }

    /**
     * Phòng còn trống, chưa xóa, lọc theo các tiêu chí của khách.
     * Nếu có vị trí thì chỉ lọc thô bằng hình chữ nhật bao quanh,
     * phần Haversine chính xác do service tính.
     */
    public static Specification<Room> publicSearch(PublicRoomSearchRequest req) {
        return (root, query, cb) -> {
            // Truy vấn đếm (COUNT) không được fetch join
            boolean isCount = Long.class.equals(query.getResultType())
                    || long.class.equals(query.getResultType());

            Join<Room, Building> b;
            if (isCount) {
                b = root.join("building", JoinType.INNER);
            } else {
                b = (Join<Room, Building>) root.<Room, Building>fetch("building", JoinType.INNER);
            }

            List<Predicate> p = new ArrayList<>();

            p.add(cb.isFalse(root.get("deleted")));
            p.add(cb.isFalse(b.get("deleted")));
            p.add(cb.equal(root.get("status"), RoomStatus.AVAILABLE));

            // Từ khóa: số phòng, tên tòa, địa chỉ
            if (StringUtils.hasText(req.getKeyword())) {
                String like = "%" + escapeLike(req.getKeyword().trim().toLowerCase(Locale.ROOT)) + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("roomNumber")), like, '\\'),
                        cb.like(cb.lower(b.get("name")), like, '\\'),
                        cb.like(cb.lower(b.get("address")), like, '\\')
                ));
            }

            if (req.getTypes() != null && !req.getTypes().isEmpty()) {
                p.add(root.get("roomType").in(req.getTypes()));
            }

            // Phải có đủ mọi tiện nghi được chọn; mỗi tiện nghi có ở phòng
            // hoặc ở tòa nhà đều được tính
            if (req.getAmenities() != null) {
                for (String name : req.getAmenities()) {
                    if (!StringUtils.hasText(name)) continue;
                    String amenityName = name.trim();

                    Subquery<Long> inRoom = query.subquery(Long.class);
                    Root<Room> r2 = inRoom.from(Room.class);
                    Join<Room, Amenity> ra = r2.join("amenities");
                    inRoom.select(r2.<Long>get("id")).where(
                            cb.equal(r2.get("id"), root.get("id")),
                            cb.equal(ra.get("name"), amenityName)
                    );

                    Subquery<Long> inBuilding = query.subquery(Long.class);
                    Root<Building> b2 = inBuilding.from(Building.class);
                    Join<Building, Amenity> ba = b2.join("amenities");
                    inBuilding.select(b2.<Long>get("id")).where(
                            cb.equal(b2.get("id"), root.get("building").get("id")),
                            cb.equal(ba.get("name"), amenityName)
                    );

                    p.add(cb.or(cb.exists(inRoom), cb.exists(inBuilding)));
                }
            }

            if (req.getPriceMin() != null) {
                p.add(cb.greaterThanOrEqualTo(root.<BigDecimal>get("rentalPrice"), req.getPriceMin()));
            }
            if (req.getPriceMax() != null) {
                p.add(cb.lessThanOrEqualTo(root.<BigDecimal>get("rentalPrice"), req.getPriceMax()));
            }
            if (req.getAreaMin() != null) {
                p.add(cb.greaterThanOrEqualTo(root.<BigDecimal>get("area"), req.getAreaMin()));
            }
            if (req.getAreaMax() != null) {
                p.add(cb.lessThan(root.<BigDecimal>get("area"), req.getAreaMax()));
            }
            if (req.getCapacityMin() != null) {
                p.add(cb.greaterThanOrEqualTo(root.<Integer>get("maxOccupancy"), req.getCapacityMin()));
            }

            if (StringUtils.hasText(req.getCity())) {
                p.add(cb.lower(b.<String>get("province")).in(LocationNames.variants(req.getCity())));
            }
            if (StringUtils.hasText(req.getWard())) {
                p.add(cb.lower(b.<String>get("ward")).in(LocationNames.variants(req.getWard())));
            }

            // Lọc thô theo hình chữ nhật quanh điểm tìm kiếm
            if (req.hasOrigin()) {
                double radius = req.getRadiusKm() != null ? req.getRadiusKm() : 2.0;
                double[] box = GeoUtils.boundingBox(req.getLat(), req.getLng(), radius);

                p.add(cb.between(b.<BigDecimal>get("latitude"),
                        BigDecimal.valueOf(box[0]), BigDecimal.valueOf(box[1])));
                p.add(cb.between(b.<BigDecimal>get("longitude"),
                        BigDecimal.valueOf(box[2]), BigDecimal.valueOf(box[3])));
            }

            return cb.and(p.toArray(new Predicate[0]));
        };
    }

    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}