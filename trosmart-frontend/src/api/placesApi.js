/**
 * Gợi ý địa điểm và lấy tọa độ cho ô "Nhập địa chỉ" ở trang tìm phòng.
 * Dùng Photon (dữ liệu OpenStreetMap), miễn phí, không cần khóa, hỗ trợ gợi ý khi đang gõ.
 *
 * Muốn đổi sang Goong/Google: chỉ cần viết lại hàm searchPlaces bên dưới sao cho
 * vẫn trả về mảng { id, label, main, sub, name, lat, lng }, trang tìm phòng không phải sửa.
 */
const PHOTON_URL = "https://photon.komoot.io/api/";

// Khung bao Việt Nam: lng_min,lat_min,lng_max,lat_max
const VIETNAM_BBOX = "102.1,8.4,109.5,23.4";

const unique = (list) => [...new Set(list.filter(Boolean))];

export async function searchPlaces(query, signal) {
  const url = new URL(PHOTON_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("bbox", VIETNAM_BBOX);

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Không gợi ý được địa điểm");

  const data = await res.json();
  const seen = new Set();
  const places = [];

  for (const feature of data.features ?? []) {
    const p = feature.properties ?? {};
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (lat == null || lng == null) continue;

    // Tên chính: tên địa điểm, hoặc "số nhà + đường" nếu là địa chỉ
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const main = p.name || street;
    if (!main) continue;

    // Phần phụ: đường (khi đã có tên), quận/huyện, thành phố/tỉnh
    const sub = unique([
      p.name ? street : null,
      p.district || p.locality,
      p.city || p.county,
      p.state,
    ]).join(", ");

    const label = sub ? `${main}, ${sub}` : main;
    if (seen.has(label)) continue;
    seen.add(label);

    places.push({
      id: `${p.osm_type ?? ""}${p.osm_id ?? label}`,
      label, // chữ điền vào ô khi chọn
      main,
      sub,
      name: unique([main, p.district || p.locality]).join(", "), // ngắn gọn, dùng cho thẻ lọc
      lat,
      lng,
    });
  }

  return places;
}