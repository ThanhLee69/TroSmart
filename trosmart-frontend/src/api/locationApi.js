/**
 * Tỉnh/thành phố và phường/xã theo mô hình hành chính 2 cấp (từ 01/07/2025),
 * gọi thẳng API bên thứ 3: https://provinces.open-api.vn (bản v2).
 * Kết quả cache trong bộ nhớ trình duyệt nên mỗi tỉnh chỉ tải một lần.
 */
const BASE_URL = "https://provinces.open-api.vn/api/v2";

const cache = new Map();

async function getJson(path, signal) {
  const res = await fetch(`${BASE_URL}${path}`, { signal });
  if (!res.ok) throw new Error("Không tải được danh mục khu vực");
  return res.json();
}

const toItems = (list) =>
  (list ?? []).map(({ code, name }) => ({ code: String(code), name }));

// Bỏ tiền tố để xếp "Hà Nội" cùng chỗ với các tỉnh khác thay vì dồn hết vào "Thành phố"
const sortKey = (name) =>
  name.replace(/^(Thành phố|Tỉnh|Phường|Xã|Đặc khu)\s+/i, "");

const sortByName = (items) =>
  [...items].sort((a, b) =>
    sortKey(a.name).localeCompare(sortKey(b.name), "vi"),
  );

// 34 tỉnh/thành phố: [{ code, name }]
export async function getProvinces() {
  if (!cache.has("provinces")) {
    const data = await getJson("/p/");
    cache.set("provinces", sortByName(toItems(data)));
  }
  return cache.get("provinces");
}

// Phường/xã/đặc khu của một tỉnh/thành phố: [{ code, name }]
export async function getWards(provinceCode) {
  const key = `wards:${provinceCode}`;
  if (!cache.has(key)) {
    const data = await getJson(`/p/${provinceCode}?depth=2`);
    cache.set(key, sortByName(toItems(data.wards)));
  }
  return cache.get(key);
}