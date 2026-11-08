import { useEffect, useState } from "react";

import { getProvinces, getWards } from "../api/locationApi";

const toOption = (item) => ({
  value: item.name,
  label: item.name,
  code: item.code,
});

/**
 * Danh sách tỉnh/thành phố và phường/xã (mô hình 2 cấp) cho ô chọn khu vực.
 * Phường/xã chỉ tải sau khi đã chọn tỉnh/thành phố (truyền vào tên tỉnh).
 * Đặt tại: src/hooks/useAreaOptions.js
 */
export default function useAreaOptions(cityName) {
  const [cities, setCities] = useState([]);
  const [wards, setWards] = useState([]);
  const [wardsLoading, setWardsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getProvinces()
      .then((list) => {
        if (!cancelled) setCities(list.map(toOption));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const city = cities.find((c) => c.value === cityName);
    if (!city) {
      setWards([]);
      return undefined;
    }

    let cancelled = false;
    setWardsLoading(true);

    getWards(city.code)
      .then((list) => {
        if (!cancelled) setWards(list.map(toOption));
      })
      .catch(() => {
        if (!cancelled) setWards([]);
      })
      .finally(() => {
        if (!cancelled) setWardsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cityName, cities]);

  return { cities, wards, wardsLoading };
}