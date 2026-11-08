import React from "react";
import { AutoComplete, Button, Input, Tooltip } from "antd";
import { AimOutlined } from "@ant-design/icons";

import { searchPlaces } from "../api/placesApi";
import "./PlaceInput.css";

/**
 * Ô nhập địa chỉ có gợi ý (tìm theo vị trí), nút định vị nằm trong ô.
 * Dùng ở trang chủ và trang Tìm phòng.
 * Đặt tại: src/components/PlaceInput.jsx
 *
 * Props:
 *  - filters : { placeText, place, gps }
 *  - onChange: (patch) => void, patch có thể gồm placeText, place, gps, sort
 *  - onUseGps: bấm nút định vị
 *  - gpsLoading
 */
function PlaceInput({ filters, onChange, onUseGps, gpsLoading }) {
  const [options, setOptions] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const justPicked = React.useRef("");
  const timer = React.useRef(null);
  const controller = React.useRef(null);

  React.useEffect(
    () => () => {
      clearTimeout(timer.current);
      controller.current?.abort();
    },
    [],
  );

  // Gõ xong khoảng nửa giây mới gọi, gõ tiếp thì hủy lần gọi cũ
  const handleSearch = (text) => {
    clearTimeout(timer.current);
    controller.current?.abort();

    const q = text.trim();
    if (q.length < 3) {
      setOptions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timer.current = setTimeout(async () => {
      const ctrl = new AbortController();
      controller.current = ctrl;
      try {
        const places = await searchPlaces(q, ctrl.signal);
        setOptions(
          places.map((p) => ({
            value: p.label,
            label: (
              <div className="place-option">
                <span className="place-option__main">{p.main}</span>
                {p.sub && <span className="place-option__sub">{p.sub}</span>}
              </div>
            ),
            place: { id: p.id, name: p.name, lat: p.lat, lng: p.lng },
          })),
        );
      } catch (err) {
        if (err.name !== "AbortError") setOptions([]);
      } finally {
        if (controller.current === ctrl) setSearching(false);
      }
    }, 450);
  };

  return (
    <AutoComplete
      value={filters.placeText}
      options={options}
      onSearch={handleSearch}
      onSelect={(value, option) => {
        justPicked.current = value;
        onChange({
          placeText: value,
          place: option.place,
          gps: null,
          sort: "distance",
        });
      }}
      onChange={(value) => {
        if (value === justPicked.current) return;
        justPicked.current = "";
        onChange({ placeText: value ?? "", place: null, gps: null });
      }}
      notFoundContent={
        searching
          ? "Đang tìm địa điểm..."
          : (filters.placeText ?? "").trim().length >= 3
            ? "Chưa tìm thấy địa điểm này"
            : null
      }
      size="large"
      className="place-input"
    >
      <Input
        size="large"
        allowClear
        placeholder="Nhập địa chỉ hoặc tên địa điểm"
        aria-label="Địa chỉ cần tìm phòng quanh đó"
        suffix={
          <Tooltip title="Dùng vị trí hiện tại của tôi">
            <Button
              type="text"
              size="small"
              shape="circle"
              loading={gpsLoading}
              icon={<AimOutlined />}
              onClick={onUseGps}
              aria-label="Dùng vị trí hiện tại của tôi"
              className={
                filters.gps
                  ? "place-input__gps place-input__gps--on"
                  : "place-input__gps"
              }
            />
          </Tooltip>
        }
      />
    </AutoComplete>
  );
}

export default PlaceInput;
