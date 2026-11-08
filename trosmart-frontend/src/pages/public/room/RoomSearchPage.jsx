import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Checkbox,
  Collapse,
  ConfigProvider,
  Drawer,
  Empty,
  Input,
  Pagination,
  Radio,
  Select,
  Tag,
  message,
} from "antd";
import { FilterOutlined, SearchOutlined } from "@ant-design/icons";

import { getPublicAmenities, searchPublicRooms } from "../../../api/publicApi";
import PublicRoomCard, {
  PublicRoomCardSkeleton,
  ROOM_TYPE_LABELS,
} from "../../../components/PublicRoomCard";
import PlaceInput from "../../../components/PlaceInput";
import useAreaOptions from "../../../hooks/useAreaOptions";
import {
  AREA_OPTIONS,
  DEFAULT_RADIUS_KM,
  PRICE_PRESETS,
  RADIUS_OPTIONS,
} from "../../../constants/roomSearchOptions";
import "./RoomSearchPage.css";

/* =====================================================================
   CẤU HÌNH BỘ LỌC
   Loại phòng lấy từ ROOM_TYPE_LABELS, tiện nghi và khu vực lấy từ API.
   ===================================================================== */

const PAGE_SIZE = 9;

const SORT_OPTIONS = [
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao đến thấp" },
  { value: "area_desc", label: "Diện tích lớn nhất" },
  { value: "distance", label: "Gần vị trí của bạn nhất", needsOrigin: true },
];

const LOCATION_MODES = [
  { value: "near", label: "Vị trí và bán kính" },
  { value: "area", label: "Khu vực" },
];

const CAPACITY_OPTIONS = [
  { value: "all", label: "Bất kỳ" },
  { value: "2", label: "Từ 2 người", min: 2 },
  { value: "3", label: "Từ 3 người", min: 3 },
  { value: "4", label: "Từ 4 người", min: 4 },
];

const DEFAULT_FILTERS = {
  q: "",
  mode: "near", // "near" | "area"
  // Chế độ "near": vị trí và bán kính
  placeText: "",
  place: null, // { id, name, lat, lng }
  gps: null, // { lat, lng }
  radiusKm: DEFAULT_RADIUS_KM,
  // Chế độ "area": tỉnh/thành phố và phường/xã (không còn cấp quận/huyện)
  city: "",
  ward: "",
  // Bộ lọc chung
  types: [],
  amenities: [],
  priceMin: null, // triệu đồng
  priceMax: null,
  area: "all",
  capacity: "all",
  sort: "price_asc",
};

/* Loại phòng: giá trị là tên enum RoomType của BE */
const TYPE_OPTIONS = Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

async function fetchRooms(params) {
  const data = await searchPublicRooms(params);
  return { items: data.items ?? [], total: data.totalItems ?? 0 };
}

/* Tiện nghi lấy từ server; tỉnh/thành, phường/xã lấy từ API hành chính */
function useFilterMeta(cityName) {
  const [amenities, setAmenities] = React.useState([]);
  const areas = useAreaOptions(cityName);

  React.useEffect(() => {
    let cancelled = false;

    getPublicAmenities()
      .then((list) => {
        if (!cancelled) setAmenities(list.map((a) => ({ value: a, label: a })));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return { amenities, ...areas };
}

/* Đọc bộ lọc từ địa chỉ trang (trang chủ chuyển sang kèm theo các tham số này):
   mode=near|area, lat, lng, radius, place, gps=1, city, ward, priceMin, priceMax, area */
function filtersFromSearch(sp) {
  const f = { ...DEFAULT_FILTERS };
  const num = (key) => {
    const raw = sp.get(key);
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const mode = sp.get("mode");
  if (mode === "area") {
    f.mode = "area";
    f.city = sp.get("city") || "";
    f.ward = f.city ? sp.get("ward") || "" : "";
  } else if (mode === "near") {
    const lat = num("lat");
    const lng = num("lng");
    if (lat != null && lng != null) {
      const radius = num("radius");
      if (RADIUS_OPTIONS.some((o) => o.value === radius)) f.radiusKm = radius;

      if (sp.get("gps") === "1") {
        f.gps = { lat, lng };
        f.placeText = "Vị trí hiện tại của bạn";
      } else {
        const name = sp.get("place") || "Vị trí đã chọn";
        f.place = { id: "from-url", name, lat, lng };
        f.placeText = name;
      }
      f.sort = "distance";
    }
  }

  f.priceMin = num("priceMin");
  f.priceMax = num("priceMax");

  const area = sp.get("area");
  if (AREA_OPTIONS.some((o) => o.value === area)) f.area = area;

  // Loại phòng: types=STUDIO hoặc types=STUDIO,LOFT (tên enum RoomType)
  const validTypes = TYPE_OPTIONS.map((o) => o.value);
  f.types = sp
    .getAll("types")
    .flatMap((v) => v.split(","))
    .filter((t, i, arr) => validTypes.includes(t) && arr.indexOf(t) === i);

  return f;
}

/* ---------- Tiện ích ---------- */

const formatPrice = (value) => new Intl.NumberFormat("vi-VN").format(value);
const km = (n) => `${String(n).replace(".", ",")} km`;
const million = (n) => String(n).replace(".", ",");

function useMediaQuery(query) {
  const getMatch = () =>
    typeof window !== "undefined" && window.matchMedia(query).matches;
  const [matches, setMatches] = React.useState(getMatch);

  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* Chuyển trạng thái bộ lọc thành tham số gửi API */
function buildSearchParams(filters, page) {
  const origin = filters.mode === "near" ? filters.gps || filters.place : null;
  const area = AREA_OPTIONS.find((o) => o.value === filters.area) || {};
  const capacity =
    CAPACITY_OPTIONS.find((o) => o.value === filters.capacity) || {};

  const params = {
    keyword: filters.q.trim() || undefined,
    types: filters.types,
    amenities: filters.amenities,
    priceMin:
      filters.priceMin != null
        ? Math.round(filters.priceMin * 1000000)
        : undefined,
    priceMax:
      filters.priceMax != null
        ? Math.round(filters.priceMax * 1000000)
        : undefined,
    areaMin: area.min,
    areaMax: area.max,
    capacityMin: capacity.min,
    sort: filters.sort === "distance" && !origin ? "price_asc" : filters.sort,
    page,
    pageSize: PAGE_SIZE,
  };

  if (origin) {
    params.lat = origin.lat;
    params.lng = origin.lng;
    params.radiusKm = filters.radiusKm;
  }
  if (filters.mode === "area") {
    params.city = filters.city || undefined;
    params.ward = filters.ward || undefined;
  }
  return params;
}

/* =====================================================================
   THÀNH PHẦN GIAO DIỆN
   ===================================================================== */

/* Chọn một giá trị: radio tròn */
function RadioList({ options, value, onChange, label }) {
  return (
    <Radio.Group
      className="option-list"
      aria-label={label}
      value={value}
      options={options}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* Chọn nhiều giá trị: checkbox vuông */
function CheckList({ options, value, onChange, label }) {
  return (
    <Checkbox.Group
      className="option-list"
      aria-label={label}
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}

/* Hai tab chọn cách tìm theo vị trí */
function LocationTabs({ value, onChange }) {
  return (
    <div className="loc-tabs" role="group" aria-label="Cách tìm theo vị trí">
      {LOCATION_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          aria-pressed={value === m.value}
          className={value === m.value ? "loc-tab loc-tab--on" : "loc-tab"}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* Bảng bộ lọc: mỗi nhóm đóng/mở được, mặc định mở hết */
function FilterPanel({
  meta,
  filters,
  onChange,
  onModeChange,
  onReset,
  onUseGps,
  gpsLoading,
}) {
  const hasOrigin = filters.mode === "near" && (filters.gps || filters.place);

  const items = [
    {
      key: "location",
      label: "Vị trí",
      children: (
        <ConfigProvider
          theme={{
            components: {
              Input: { controlHeightLG: 44, borderRadiusLG: 10 },
              Select: { controlHeightLG: 44, borderRadiusLG: 10 },
            },
          }}
        >
          <div className="loc-box">
            <LocationTabs value={filters.mode} onChange={onModeChange} />
            {filters.mode === "near" ? (
              <>
                <PlaceInput
                  filters={filters}
                  onChange={onChange}
                  onUseGps={onUseGps}
                  gpsLoading={gpsLoading}
                />
                <Select
                  size="large"
                  value={filters.radiusKm}
                  options={RADIUS_OPTIONS}
                  onChange={(radiusKm) => onChange({ radiusKm })}
                  aria-label="Bán kính tìm kiếm"
                />
                {hasOrigin && (
                  <span className="filter-note">
                    Phòng trong bán kính {km(filters.radiusKm)} quanh{" "}
                    {filters.gps
                      ? "vị trí hiện tại của bạn"
                      : filters.place.name}
                    .
                  </span>
                )}
              </>
            ) : (
              <>
                <Select
                  size="large"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Tỉnh / Thành phố"
                  value={filters.city || undefined}
                  options={meta.cities}
                  onChange={(city) => onChange({ city: city || "", ward: "" })}
                  aria-label="Tỉnh / Thành phố"
                />
                <Select
                  size="large"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  loading={meta.wardsLoading}
                  disabled={!filters.city}
                  placeholder={
                    filters.city ? "Phường / Xã" : "Chọn tỉnh / thành phố trước"
                  }
                  value={filters.ward || undefined}
                  options={meta.wards}
                  onChange={(ward) => onChange({ ward: ward || "" })}
                  aria-label="Phường / Xã"
                />
              </>
            )}
          </div>
        </ConfigProvider>
      ),
    },
    {
      key: "types",
      label: "Loại phòng",
      children: (
        <CheckList
          label="Loại phòng"
          options={TYPE_OPTIONS}
          value={filters.types}
          onChange={(types) => onChange({ types })}
        />
      ),
    },
    {
      key: "price",
      label: "Giá thuê mỗi tháng",
      children: (
        <div className="filter-stack">
          <Radio.Group
            className="option-list"
            aria-label="Mức giá gợi ý"
            value={PRICE_PRESETS.findIndex(
              (p) => p.min === filters.priceMin && p.max === filters.priceMax,
            )}
            options={PRICE_PRESETS.map((p, i) => ({
              value: i,
              label: p.label,
            }))}
            onChange={(e) => {
              const p = PRICE_PRESETS[e.target.value];
              onChange({ priceMin: p.min, priceMax: p.max });
            }}
          />
        </div>
      ),
    },
    {
      key: "area",
      label: "Diện tích",
      children: (
        <RadioList
          label="Diện tích"
          options={AREA_OPTIONS}
          value={filters.area}
          onChange={(area) => onChange({ area })}
        />
      ),
    },
    {
      key: "capacity",
      label: "Sức chứa",
      children: (
        <RadioList
          label="Sức chứa"
          options={CAPACITY_OPTIONS}
          value={filters.capacity}
          onChange={(capacity) => onChange({ capacity })}
        />
      ),
    },
    {
      key: "amenities",
      label: "Tiện nghi",
      children: (
        <CheckList
          label="Tiện nghi"
          options={meta.amenities}
          value={filters.amenities}
          onChange={(amenities) => onChange({ amenities })}
        />
      ),
    },
  ];

  return (
    <div className="filter-panel">
      <div className="filter-panel__head">
        <h2>Bộ lọc</h2>
        <Button type="text" className="filter-clear" onClick={onReset}>
          Xóa tất cả
        </Button>
      </div>
      <Collapse
        ghost
        className="filter-collapse"
        expandIconPosition="end"
        defaultActiveKey={items.map((i) => i.key)}
        items={items}
      />
    </div>
  );
}

/* =====================================================================
   TRANG TÌM PHÒNG
   ===================================================================== */

function RoomSearchPage() {
  const isDesktop = useMediaQuery("(min-width: 992px)");
  const resultsRef = React.useRef(null);

  const [searchParams] = useSearchParams();
  const [filters, setFilters] = React.useState(() =>
    filtersFromSearch(searchParams),
  );
  const meta = useFilterMeta(filters.city);
  const [page, setPage] = React.useState(1);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [gpsLoading, setGpsLoading] = React.useState(false);

  const [result, setResult] = React.useState({ items: [], total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  // Ô gõ chữ và ô nhập giá chờ gõ xong mới tải lại
  const debouncedQ = useDebounce(filters.q);
  const debouncedMin = useDebounce(filters.priceMin);
  const debouncedMax = useDebounce(filters.priceMax);

  const paramsKey = JSON.stringify(
    buildSearchParams(
      {
        ...filters,
        q: debouncedQ,
        priceMin: debouncedMin,
        priceMax: debouncedMax,
      },
      page,
    ),
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchRooms(JSON.parse(paramsKey))
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paramsKey, reloadKey]);

  /* ---------- Thao tác ---------- */

  const updateFilters = React.useCallback((patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  // Chỉ dùng một trong hai cách: vị trí và bán kính, hoặc khu vực
  const changeMode = (mode) => {
    updateFilters({
      mode,
      placeText: "",
      place: null,
      gps: null,
      radiusKm: DEFAULT_FILTERS.radiusKm,
      city: "",
      ward: "",
      sort: filters.sort === "distance" ? "price_asc" : filters.sort,
    });
  };

  const useMyLocation = () => {
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
        updateFilters({
          gps: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          place: null,
          placeText: "Vị trí hiện tại của bạn",
          sort: "distance",
        });
      },
      () => {
        setGpsLoading(false);
        message.warning(
          "Chưa lấy được vị trí. Hãy cho phép truy cập vị trí hoặc nhập địa chỉ.",
        );
      },
      { timeout: 8000 },
    );
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ---------- Dữ liệu hiển thị ---------- */

  const origin = filters.mode === "near" ? filters.gps || filters.place : null;
  const sortValue =
    filters.sort === "distance" && !origin ? "price_asc" : filters.sort;

  const sortOptions = SORT_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
    disabled: o.needsOrigin && !origin,
  }));

  // Các bộ lọc đang áp dụng, bấm dấu x để bỏ từng cái
  const activeTags = React.useMemo(() => {
    const tags = [];
    const labelOf = (list, value) =>
      list.find((o) => o.value === value)?.label || value;

    if (filters.q.trim())
      tags.push({ key: "q", label: `"${filters.q.trim()}"`, clear: { q: "" } });
    if (origin) {
      tags.push({
        key: "origin",
        label: `Trong ${km(filters.radiusKm)} quanh ${
          filters.gps ? "vị trí của bạn" : filters.place.name
        }`,
        clear: {
          place: null,
          gps: null,
          placeText: "",
          radiusKm: DEFAULT_FILTERS.radiusKm,
        },
      });
    }
    if (filters.mode === "area" && filters.city) {
      tags.push({
        key: "area-place",
        label: [filters.ward, filters.city].filter(Boolean).join(", "),
        clear: { city: "", ward: "" },
      });
    }
    filters.types.forEach((v) =>
      tags.push({
        key: `t-${v}`,
        label: labelOf(TYPE_OPTIONS, v),
        clear: { types: filters.types.filter((x) => x !== v) },
      }),
    );
    if (filters.priceMin != null || filters.priceMax != null) {
      const { priceMin: lo, priceMax: hi } = filters;
      const label =
        lo != null && hi != null
          ? `${million(lo)} - ${million(hi)} triệu`
          : lo != null
            ? `Từ ${million(lo)} triệu`
            : `Đến ${million(hi)} triệu`;
      tags.push({
        key: "price",
        label,
        clear: { priceMin: null, priceMax: null },
      });
    }
    if (filters.area !== "all")
      tags.push({
        key: "area",
        label: labelOf(AREA_OPTIONS, filters.area),
        clear: { area: "all" },
      });
    if (filters.capacity !== "all")
      tags.push({
        key: "cap",
        label: labelOf(CAPACITY_OPTIONS, filters.capacity),
        clear: { capacity: "all" },
      });
    filters.amenities.forEach((v) =>
      tags.push({
        key: `a-${v}`,
        label: v,
        clear: { amenities: filters.amenities.filter((x) => x !== v) },
      }),
    );
    return tags;
  }, [filters, origin]);

  const panel = (
    <FilterPanel
      meta={meta}
      filters={filters}
      onChange={updateFilters}
      onModeChange={changeMode}
      onReset={resetFilters}
      onUseGps={useMyLocation}
      gpsLoading={gpsLoading}
    />
  );

  return (
    <main className="find-page">
      <div className="find-page__inner">
        <Breadcrumb
          className="find-page__breadcrumb"
          items={[
            { title: <Link to="/">Trang chủ</Link> },
            { title: "Tìm phòng" },
          ]}
        />

        <div className="find-page__layout">
          {/* Cột bộ lọc chỉ hiện trên desktop, màn nhỏ hơn dùng Drawer */}
          {isDesktop && (
            <aside className="find-page__aside" aria-label="Bộ lọc phòng">
              {panel}
            </aside>
          )}

          <div className="find-page__results" ref={resultsRef}>
            <div className="find-page__searchbar">
              <Input
                size="large"
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Tìm theo tên phòng, tòa nhà hoặc loại phòng"
                aria-label="Tìm theo tên phòng, tòa nhà hoặc loại phòng"
                value={filters.q}
                onChange={(e) => updateFilters({ q: e.target.value })}
              />
              {!isDesktop && (
                <Badge count={activeTags.length} size="small" offset={[-4, 4]}>
                  <Button
                    size="large"
                    icon={<FilterOutlined />}
                    onClick={() => setDrawerOpen(true)}
                  >
                    Bộ lọc
                  </Button>
                </Badge>
              )}
            </div>

            <div className="find-page__toolbar">
              <p className="find-page__count">
                <strong>
                  {loading && result.total === 0
                    ? "..."
                    : `${result.total} phòng`}
                </strong>{" "}
                đang trống
              </p>
              <div className="find-page__sort">
                <label htmlFor="sort-select">Sắp xếp</label>
                <Select
                  id="sort-select"
                  value={sortValue}
                  options={sortOptions}
                  onChange={(sort) => updateFilters({ sort })}
                  popupMatchSelectWidth={false}
                />
              </div>
            </div>

            {activeTags.length > 0 && (
              <div className="find-page__tags">
                {activeTags.map((tag) => (
                  <Tag
                    key={tag.key}
                    closable
                    onClose={(e) => {
                      e.preventDefault();
                      updateFilters(tag.clear);
                    }}
                  >
                    {tag.label}
                  </Tag>
                ))}
              </div>
            )}

            {error && (
              <Alert
                type="error"
                showIcon
                message="Không tải được danh sách phòng"
                description="Vui lòng kiểm tra kết nối rồi thử lại."
                action={
                  <Button
                    size="small"
                    onClick={() => setReloadKey((k) => k + 1)}
                  >
                    Thử lại
                  </Button>
                }
              />
            )}

            {!error && (
              <div className="find-page__grid" aria-busy={loading}>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <PublicRoomCardSkeleton key={i} />
                    ))
                  : result.items.map((room) => (
                      <PublicRoomCard
                        key={room.id}
                        room={room}
                        distanceText={
                          room.distanceKm != null
                            ? `Khoảng cách ${km(room.distanceKm.toFixed(1))}`
                            : undefined
                        }
                      />
                    ))}
              </div>
            )}

            {!loading && !error && result.items.length === 0 && (
              <div className="find-page__empty">
                <Empty
                  description={
                    <>
                      <strong>Chưa có phòng phù hợp</strong>
                      <br />
                      Thử tăng bán kính, bỏ bớt bộ lọc hoặc đổi từ khóa để xem
                      thêm phòng đang trống.
                    </>
                  }
                >
                  <Button type="primary" size="large" onClick={resetFilters}>
                    Xóa bộ lọc
                  </Button>
                </Empty>
              </div>
            )}

            {result.total > PAGE_SIZE && (
              <Pagination
                className="find-page__pagination"
                current={page}
                pageSize={PAGE_SIZE}
                total={result.total}
                showSizeChanger={false}
                responsive
                onChange={changePage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bộ lọc dạng ngăn kéo cho điện thoại và iPad */}
      <Drawer
        title="Bộ lọc"
        placement="left"
        width="min(92vw, 360px)"
        open={drawerOpen && !isDesktop}
        onClose={() => setDrawerOpen(false)}
        rootClassName="find-drawer"
        footer={
          <div className="find-drawer__footer">
            <Button size="large" onClick={resetFilters}>
              Xóa tất cả
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={() => setDrawerOpen(false)}
            >
              Xem {result.total} phòng
            </Button>
          </div>
        }
      >
        {panel}
      </Drawer>
    </main>
  );
}

export default RoomSearchPage;
