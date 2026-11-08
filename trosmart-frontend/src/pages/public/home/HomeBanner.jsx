import React, { useState } from "react";
import { Button, ConfigProvider, Select, message } from "antd";
import {
  AimOutlined,
  CheckCircleFilled,
  EnvironmentOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import PlaceInput from "../../../components/PlaceInput";
import useAreaOptions from "../../../hooks/useAreaOptions";
import {
  AREA_OPTIONS,
  DEFAULT_RADIUS_KM,
  PRICE_PRESETS,
  RADIUS_OPTIONS,
} from "../../../constants/roomSearchOptions";
import "./HomeBanner.css";
import heroImage from "../../../assets/images/banner2.jpeg";
import image6 from "../../../assets/images/anh6.jpeg";
import image2 from "../../../assets/images/anh2.avif";
import image7 from "../../../assets/images/anh7.jpeg";

const SEARCH_MODES = [
  { value: "area", label: "Theo khu vực", icon: <EnvironmentOutlined /> },
  { value: "near", label: "Theo vị trí", icon: <AimOutlined /> },
];

// Ảnh nền banner (ảnh minh họa từ Unsplash, tông xám xanh hợp màu web).
// Muốn dùng ảnh thật của khu trọ: import ảnh vào rồi gán cho HERO_IMAGE,
// ví dụ import heroImage from "../../../assets/images/banner.avif";
const HERO_IMAGE = heroImage;

// Cụm ảnh nhỏ bên phải banner (cũng là ảnh minh họa Unsplash, thay bằng ảnh thật khi có)
const HERO_PHOTOS = [
  {
    key: "main",
    alt: "Phòng khách sáng, nội thất gọn gàng",
    src: image6,
  },
  {
    key: "side",
    alt: "Phòng ngủ thoáng và sạch",
    src: image2,
  },
  {
    key: "small",
    alt: "Phòng ngủ tối giản",
    src: image7,
  },
];

const PRICE_OPTIONS = PRICE_PRESETS.map((p, index) => ({
  value: index,
  label: p.label,
}));

const km = (n) => `${String(n).replace(".", ",")} km`;

const HomeBanner = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState("area");

  // Tìm theo khu vực
  const [city, setCity] = useState("");
  const [ward, setWard] = useState("");

  // Tìm theo vị trí
  const [loc, setLoc] = useState({ placeText: "", place: null, gps: null });
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Dùng chung
  const [priceIndex, setPriceIndex] = useState(0);
  const [areaKey, setAreaKey] = useState("all");

  const { cities, wards, wardsLoading } = useAreaOptions(city);

  const origin = loc.gps || loc.place;

  const patchLoc = (patch) => setLoc((prev) => ({ ...prev, ...patch }));

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      message.warning(
        "Trình duyệt này không hỗ trợ định vị. Hãy nhập địa chỉ.",
      );
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setLoc({
          placeText: "Vị trí hiện tại của bạn",
          place: null,
          gps: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        });
      },
      () => {
        setGpsLoading(false);
        message.warning(
          "Chưa lấy được vị trí. Hãy cho phép truy cập vị trí hoặc nhập địa chỉ.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Chuyển sang trang Tìm phòng kèm đúng các điều kiện vừa chọn
  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("mode", mode);

    if (mode === "area") {
      if (city) params.set("city", city);
      if (city && ward) params.set("ward", ward);
    } else if (origin) {
      params.set("lat", origin.lat.toFixed(6));
      params.set("lng", origin.lng.toFixed(6));
      params.set("radius", radiusKm);
      if (loc.gps) params.set("gps", "1");
      else params.set("place", loc.place.name);
    } else if (loc.placeText.trim()) {
      message.info(
        "Hãy chọn một địa điểm trong danh sách gợi ý, hoặc dùng vị trí hiện tại.",
      );
      return;
    }

    const price = PRICE_PRESETS[priceIndex];
    if (price.min != null) params.set("priceMin", price.min);
    if (price.max != null) params.set("priceMax", price.max);

    if (areaKey !== "all") params.set("area", areaKey);

    navigate(`/tim-phong?${params.toString()}`);
  };

  return (
    <div className="hb">
      <section
        className="hb-hero"
        style={{ "--hb-banner": `url(${HERO_IMAGE})` }}
      >
        <div className="hb-hero__content">
          <span className="hb-eyebrow">NHÀ TRỌ THÔNG MINH</span>

          <h1 className="hb-hero__title">Tìm căn phòng trọ hợp với bạn.</h1>

          <p className="hb-hero__lead">
            Khám phá phòng trọ quanh khu vực của bạn, so sánh giá thuê và tiện
            nghi để nhanh chóng tìm được nơi ở phù hợp.
          </p>
        </div>

        {/* Cụm ảnh so le: khung kính phía sau, vòm màu lệch, ba ảnh viền trắng */}
        <div className="hb-collage" aria-hidden="true">
          <span className="hb-collage__frame" />
          <span className="hb-collage__arch" />

          {HERO_PHOTOS.map((photo) => (
            <div
              key={photo.key}
              className={`hb-collage__item hb-collage__${photo.key}`}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="eager"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          ))}

          <span className="hb-collage__ring" />
        </div>
      </section>

      {/* Form nổi: một phần đè lên banner */}
      <div className="hb-form" role="search">
        <div className="hb-form__head">
          <div className="hb-tabs" role="group" aria-label="Cách tìm phòng">
            {SEARCH_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={mode === m.value}
                className={mode === m.value ? "hb-tab hb-tab--on" : "hb-tab"}
                onClick={() => setMode(m.value)}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          <span className="hb-form__note">
            <CheckCircleFilled /> Chỉ hiện phòng còn trống
          </span>
        </div>

        <ConfigProvider
          theme={{
            components: {
              Input: { controlHeightLG: 44, borderRadiusLG: 12 },
              Select: { controlHeightLG: 44, borderRadiusLG: 12 },
              Button: { controlHeightLG: 44, borderRadiusLG: 12 },
            },
          }}
        >
          <div className="hb-grid">
            <div className="hb-field hb-field--loc">
              <div className="hb-label">
                {mode === "area" ? "Khu vực" : "Vị trí và bán kính"}
              </div>

              {mode === "area" ? (
                <div className="hb-loc hb-loc--area">
                  <Select
                    size="large"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Tỉnh / Thành phố"
                    value={city || undefined}
                    options={cities}
                    onChange={(value) => {
                      setCity(value || "");
                      setWard("");
                    }}
                    aria-label="Tỉnh / Thành phố"
                  />
                  <Select
                    size="large"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    loading={wardsLoading}
                    disabled={!city}
                    placeholder={city ? "Phường / Xã" : "Chọn tỉnh trước"}
                    value={ward || undefined}
                    options={wards}
                    onChange={(value) => setWard(value || "")}
                    aria-label="Phường / Xã"
                  />
                </div>
              ) : (
                <div className="hb-loc hb-loc--near">
                  <PlaceInput
                    filters={loc}
                    onChange={patchLoc}
                    onUseGps={handleUseGps}
                    gpsLoading={gpsLoading}
                  />
                  <Select
                    size="large"
                    value={radiusKm}
                    options={RADIUS_OPTIONS}
                    onChange={setRadiusKm}
                    aria-label="Bán kính tìm kiếm"
                  />
                </div>
              )}
            </div>

            <div className="hb-field">
              <div className="hb-label">Mức giá</div>
              <Select
                size="large"
                value={priceIndex}
                options={PRICE_OPTIONS}
                onChange={setPriceIndex}
                aria-label="Mức giá"
              />
            </div>

            <div className="hb-field">
              <div className="hb-label">Diện tích</div>
              <Select
                size="large"
                value={areaKey}
                options={AREA_OPTIONS}
                onChange={setAreaKey}
                aria-label="Diện tích"
              />
            </div>

            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              className="hb-submit"
              onClick={handleSearch}
            >
              Tìm phòng
            </Button>
          </div>
        </ConfigProvider>

        {mode === "near" && origin && (
          <p className="hb-hint">
            Tìm phòng trong bán kính {km(radiusKm)} quanh{" "}
            {loc.gps ? "vị trí hiện tại của bạn" : loc.place.name}.
          </p>
        )}
      </div>
    </div>
  );
};

export default HomeBanner;
