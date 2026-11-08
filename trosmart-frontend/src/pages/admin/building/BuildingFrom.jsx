import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Checkbox,
  Select,
  Spin,
  Button,
  Divider,
  Grid,
  Typography,
  Alert,
} from "antd";
import {
  AimOutlined,
  EditOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  LinkOutlined,
  SearchOutlined,
} from "@ant-design/icons";

import { createBuilding, updateBuilding } from "../../../api/buildingApi";
import { getBuildingAmenities } from "../../../api/amenityApi";
import "./BuildingPage.css";

const { TextArea } = Input;
const { Text, Link } = Typography;

const PROVINCE_API = "https://provinces.open-api.vn/api/v2";

// Dịch vụ tìm tọa độ từ địa chỉ (OpenStreetMap, miễn phí, không cần API key)
const GEOCODE_API = "https://nominatim.openstreetmap.org/search";

// Làm tròn đúng với precision = 10, scale = 7 ở backend
const roundCoordinate = (value) => Number(Number(value).toFixed(7));

const isValidCoordinate = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

// Đọc tọa độ người dùng dán vào. Hỗ trợ:
//   - Thập phân:  10.7769, 106.7009
//   - Độ phút giây: 21°01'45.2"N 105°47'54.0"E
// Trả về { lat, lng } hoặc null nếu không nhận ra
const parseCoordinates = (text) => {
  const dmsPattern =
    /(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*['′’]\s*(?:(\d+(?:\.\d+)?)\s*(?:["″”]|''|′′)?)?\s*([NSEW])/gi;

  const dmsMatches = [...text.matchAll(dmsPattern)];

  if (dmsMatches.length >= 2) {
    let lat = null;
    let lng = null;

    dmsMatches.forEach((m) => {
      const degrees = Number(m[1]);
      const minutes = Number(m[2]);
      const seconds = m[3] ? Number(m[3]) : 0;
      const direction = m[4].toUpperCase();

      let value = degrees + minutes / 60 + seconds / 3600;

      if (direction === "S" || direction === "W") value = -value;

      if (direction === "N" || direction === "S") lat = value;
      else lng = value;
    });

    return lat !== null && lng !== null ? { lat, lng } : null;
  }

  const decimal = text.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);

  return decimal ? { lat: Number(decimal[1]), lng: Number(decimal[2]) } : null;
};

// Tìm tọa độ cho một chuỗi địa chỉ, không thấy thì trả về null
const geocode = async (query) => {
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "vn",
    "accept-language": "vi",
    q: query,
  });

  const response = await fetch(`${GEOCODE_API}?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Dịch vụ tìm tọa độ đang không phản hồi");
  }

  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;

  if (!first) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);

  return isValidCoordinate(lat, lng) ? { lat, lng } : null;
};

// Bản đồ xem trước (OpenStreetMap, không cần thư viện)
const MapPreview = ({ lat, lng }) => {
  const dLng = 0.005;
  const dLat = 0.003;

  const src =
    "https://www.openstreetmap.org/export/embed.html" +
    `?bbox=${lng - dLng}%2C${lat - dLat}%2C${lng + dLng}%2C${lat + dLat}` +
    `&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <div className="bf-map">
      <iframe title="Vị trí tòa nhà" src={src} loading="lazy" />
    </div>
  );
};

const BuildingForm = ({
  isMode,
  record,
  isModal,
  hideModal,
  fetchBuilding,
  notify,
  setLoading,
}) => {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isEdit = isMode === "edit";

  const [amenities, setAmenities] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tọa độ
  const [findingCoords, setFindingCoords] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coordNote, setCoordNote] = useState(null); // { type, message }
  const [pasteText, setPasteText] = useState("");

  const fetchingAmenitiesRef = useRef(false);
  const previousRecordIdRef = useRef(null);

  const selectedProvince = Form.useWatch("province", form);
  const latitude = Form.useWatch("latitude", form);
  const longitude = Form.useWatch("longitude", form);

  const hasCoordinates =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    isValidCoordinate(Number(latitude), Number(longitude));

  // Lấy danh sách tỉnh/thành phố
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);

      try {
        const response = await fetch(`${PROVINCE_API}/p/`);

        if (!response.ok) {
          throw new Error("Không thể tải danh sách tỉnh/thành phố");
        }

        const data = await response.json();
        setProvinces(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Lỗi tải tỉnh/thành phố:", error);

        notify?.({
          type: "error",
          message: "Không thể tải danh sách tỉnh/thành phố.",
        });
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  // Lấy danh sách tiện nghi
  useEffect(() => {
    if (!isModal || fetchingAmenitiesRef.current) return;

    const fetchAmenities = async () => {
      fetchingAmenitiesRef.current = true;

      try {
        const response = await getBuildingAmenities();

        const data = Array.isArray(response)
          ? response
          : (response?.data?.result ?? response?.data ?? []);

        setAmenities(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Lỗi tải tiện nghi:", error);

        notify?.({
          type: "error",
          message: "Không thể tải danh sách tiện nghi.",
        });
      } finally {
        fetchingAmenitiesRef.current = false;
      }
    };

    fetchAmenities();
  }, [isModal]);

  // Lấy danh sách phường/xã theo tỉnh/thành phố
  const loadWards = async (provinceCode) => {
    if (!provinceCode) {
      setWards([]);
      return [];
    }

    setLoadingWards(true);

    try {
      const response = await fetch(`${PROVINCE_API}/p/${provinceCode}?depth=2`);

      if (!response.ok) {
        throw new Error("Không thể tải danh sách phường/xã");
      }

      const data = await response.json();

      const wardList = Array.isArray(data?.wards) ? data.wards : [];

      setWards(wardList);

      return wardList;
    } catch (error) {
      console.error("Lỗi tải phường/xã:", error);

      setWards([]);

      notify?.({
        type: "error",
        message: "Không thể tải danh sách phường/xã.",
      });

      return [];
    } finally {
      setLoadingWards(false);
    }
  };

  // Khởi tạo dữ liệu khi thêm hoặc sửa tòa nhà
  useEffect(() => {
    if (!isModal) {
      form.resetFields();
      setWards([]);
      setCoordNote(null);
      setPasteText("");
      previousRecordIdRef.current = null;
      return;
    }

    // Chế độ thêm mới
    if (isMode !== "edit" || !record) {
      if (previousRecordIdRef.current === "create") return;

      form.resetFields();
      setWards([]);
      setCoordNote(null);

      form.setFieldsValue({
        latitude: null,
        longitude: null,
        amenities: [],
      });

      previousRecordIdRef.current = "create";
      return;
    }

    // Chờ tải tỉnh/thành phố xong trước khi khởi tạo dữ liệu sửa
    if (provinces.length === 0) return;

    const recordId = record.id;

    if (previousRecordIdRef.current === recordId) return;

    const initializeForm = async () => {
      const province = provinces.find((item) => item.name === record.province);

      const wardList = province ? await loadWards(province.code) : [];

      form.setFieldsValue({
        name: record.name,
        province: record.province,
        ward: record.ward,
        address: record.address,
        description: record.description,
        amenities: Array.isArray(record.amenities)
          ? record.amenities.map((item) =>
              typeof item === "object" ? item.id : item,
            )
          : [],
        latitude:
          record.latitude !== null && record.latitude !== undefined
            ? Number(record.latitude)
            : null,
        longitude:
          record.longitude !== null && record.longitude !== undefined
            ? Number(record.longitude)
            : null,
      });

      // Nếu phường/xã cũ không còn trong danh sách, vẫn giữ dữ liệu hiện có
      if (
        record.ward &&
        wardList.length > 0 &&
        !wardList.some((item) => item.name === record.ward)
      ) {
        form.setFieldsValue({ ward: record.ward });
      }

      setCoordNote(null);
      previousRecordIdRef.current = recordId;
    };

    initializeForm();
  }, [isModal, isMode, record, provinces, form]);

  // Khi thay đổi tỉnh/thành phố
  const handleProvinceChange = async (provinceName) => {
    const province = provinces.find((item) => item.name === provinceName);

    form.setFieldsValue({ ward: undefined });

    setWards([]);

    if (province) {
      await loadWards(province.code);
    }
  };

  // Địa chỉ đổi thì tọa độ cũ không còn đúng nữa -> xóa để tìm lại
  const handleValuesChange = (changedValues) => {
    const addressChanged =
      "province" in changedValues ||
      "ward" in changedValues ||
      "address" in changedValues;

    if (addressChanged && (latitude != null || longitude != null)) {
      form.setFieldsValue({ latitude: null, longitude: null });
      setCoordNote({
        type: "info",
        message: 'Địa chỉ đã thay đổi, hãy bấm "Tìm tọa độ" để cập nhật lại.',
      });
    }
  };

  const setCoordinates = (lat, lng) => {
    form.setFieldsValue({
      latitude: roundCoordinate(lat),
      longitude: roundCoordinate(lng),
    });
    form.setFields([
      { name: "latitude", errors: [] },
      { name: "longitude", errors: [] },
    ]);
  };

  // Cách 1: tìm tọa độ từ địa chỉ đã nhập
  const handleFindCoordinates = async () => {
    try {
      await form.validateFields(["province", "ward", "address"]);
    } catch {
      setCoordNote({
        type: "warning",
        message:
          "Vui lòng nhập tỉnh/thành, phường/xã và địa chỉ trước khi tìm tọa độ.",
      });
      return;
    }

    const { province, ward, address } = form.getFieldsValue([
      "province",
      "ward",
      "address",
    ]);

    // Thử từ chi tiết nhất đến thô nhất, vì địa chỉ Việt Nam hay không khớp hoàn toàn
    const attempts = [
      {
        query: [address.trim(), ward, province, "Việt Nam"].join(", "),
        note: null,
      },
      {
        query: [ward, province, "Việt Nam"].join(", "),
        note: "Chỉ tìm được vị trí gần đúng theo phường/xã. Hãy kiểm tra trên bản đồ và chỉnh lại nếu cần.",
      },
      {
        query: [province, "Việt Nam"].join(", "),
        note: 'Chỉ tìm được vị trí chung của tỉnh/thành. Nên dùng "Vị trí hiện tại" hoặc dán tọa độ từ Google Maps.',
      },
    ];

    setFindingCoords(true);
    setCoordNote(null);

    try {
      for (const attempt of attempts) {
        const found = await geocode(attempt.query);

        if (found) {
          setCoordinates(found.lat, found.lng);
          setCoordNote(
            attempt.note
              ? { type: "warning", message: attempt.note }
              : {
                  type: "success",
                  message:
                    "Đã tìm thấy tọa độ. Hãy xem bản đồ bên dưới để chắc chắn đúng vị trí.",
                },
          );
          return;
        }
      }

      setCoordNote({
        type: "error",
        message:
          'Không tìm thấy tọa độ cho địa chỉ này. Hãy dùng "Vị trí hiện tại" hoặc dán tọa độ từ Google Maps.',
      });
    } catch (error) {
      console.error("Lỗi tìm tọa độ:", error);

      setCoordNote({
        type: "error",
        message:
          error.message ||
          "Không thể tìm tọa độ lúc này. Vui lòng thử lại sau.",
      });
    } finally {
      setFindingCoords(false);
    }
  };

  // Cách 2: lấy vị trí hiện tại của thiết bị (hữu ích khi chủ trọ đang đứng ở tòa nhà)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCoordNote({
        type: "error",
        message: "Trình duyệt không hỗ trợ lấy vị trí.",
      });
      return;
    }

    setLocating(true);
    setCoordNote(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates(position.coords.latitude, position.coords.longitude);
        setCoordNote({
          type: "success",
          message:
            "Đã lấy vị trí hiện tại của bạn. Chỉ đúng nếu bạn đang ở tòa nhà.",
        });
        setLocating(false);
      },
      (error) => {
        setCoordNote({
          type: "error",
          message:
            error.code === 1
              ? "Bạn đã chặn quyền truy cập vị trí. Hãy cho phép trong cài đặt trình duyệt."
              : "Không lấy được vị trí hiện tại.",
        });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Cách 3: dán "10.7769, 106.7009" copy từ Google Maps (chuột phải vào điểm trên bản đồ)
  const handlePasteCoordinates = (event) => {
    const text = event.target.value;
    setPasteText(text);

    const parsed = parseCoordinates(text);

    if (!parsed) return;

    const { lat, lng } = parsed;

    if (!isValidCoordinate(lat, lng)) {
      setCoordNote({
        type: "error",
        message: "Tọa độ không hợp lệ (vĩ độ -90..90, kinh độ -180..180).",
      });
      return;
    }

    setCoordinates(lat, lng);
    setCoordNote({ type: "success", message: "Đã nhận tọa độ vừa dán." });
  };

  // Lưu tòa nhà
  const handleSubmit = async () => {
    if (saving) return;

    let values;

    try {
      values = await form.validateFields();
    } catch (error) {
      if (error?.errorFields) return;
      throw error;
    }

    setSaving(true);
    setLoading?.(true);

    try {
      const payload = {
        name: values.name.trim(),
        province: values.province,
        ward: values.ward,
        address: values.address.trim(),
        description: values.description?.trim() || null,
        amenityIds: values.amenities || [],
        latitude:
          values.latitude != null ? roundCoordinate(values.latitude) : null,
        longitude:
          values.longitude != null ? roundCoordinate(values.longitude) : null,
      };

      if (isMode === "edit") {
        await updateBuilding(record.id, payload);
      } else {
        await createBuilding(payload);
      }

      notify?.({
        type: "success",
        message:
          isMode === "edit"
            ? "Cập nhật tòa nhà thành công!"
            : "Thêm tòa nhà thành công!",
      });

      await fetchBuilding?.();

      hideModal();

      form.resetFields();
      setWards([]);
      setCoordNote(null);
      previousRecordIdRef.current = null;
    } catch (error) {
      console.error("BuildingForm error:", error);

      notify?.({
        type: "error",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Không thể lưu tòa nhà. Vui lòng kiểm tra backend.",
      });
    } finally {
      setSaving(false);
      setLoading?.(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;

    hideModal();
    form.resetFields();
    setWards([]);
    setCoordNote(null);
    previousRecordIdRef.current = null;
  };

  // Hai ô tọa độ phải đi cùng nhau: hoặc có cả hai, hoặc để trống cả hai
  const requirePair = (otherField, label) => ({
    validator: (_, value) => {
      const other = form.getFieldValue(otherField);
      const hasValue = value !== null && value !== undefined && value !== "";
      const otherHasValue =
        other !== null && other !== undefined && other !== "";

      if (!hasValue && otherHasValue) {
        return Promise.reject(new Error(`Vui lòng nhập ${label}!`));
      }

      return Promise.resolve();
    },
  });

  return (
    <Modal
      className="bf-modal"
      title={
        <div className="bf-title">
          <span className="bf-title__icon">
            {isEdit ? <EditOutlined /> : <HomeOutlined />}
          </span>
          <div>
            <div className="bf-title__main">
              {isEdit ? "Cập nhật tòa nhà" : "Thêm tòa nhà mới"}
            </div>
            <div className="bf-title__sub">
              {isEdit
                ? "Chỉnh sửa thông tin, vị trí và tiện nghi"
                : "Nhập thông tin, vị trí và tiện nghi của tòa nhà"}
            </div>
          </div>
        </div>
      }
      open={isModal}
      onCancel={handleCancel}
      centered
      closable={!saving}
      maskClosable={!saving}
      destroyOnHidden
      width="min(680px, calc(100vw - 24px))"
      styles={{ body: { maxHeight: "calc(100dvh - 210px)" } }}
      footer={
        <div className={`bf-footer ${isMobile ? "is-mobile" : ""}`}>
          <Button block={isMobile} onClick={handleCancel} disabled={saving}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            block={isMobile}
            className="bf-btn-primary"
            loading={saving}
            onClick={handleSubmit}
          >
            {isEdit ? "Cập nhật" : "Thêm mới"}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        requiredMark={false}
        disabled={saving}
        onValuesChange={handleValuesChange}
      >
        <Row gutter={[16, 0]}>
          {/* Tên tòa nhà */}
          <Col xs={24}>
            <Form.Item
              label="Tên tòa nhà"
              name="name"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Vui lòng nhập tên tòa nhà!",
                },
                {
                  max: 100,
                  message: "Tên tòa nhà không được vượt quá 100 ký tự!",
                },
              ]}
            >
              <Input placeholder="Nhập tên tòa nhà" maxLength={100} />
            </Form.Item>
          </Col>

          {/* Tỉnh/thành phố */}
          <Col xs={24} sm={12}>
            <Form.Item
              label="Tỉnh/Thành phố"
              name="province"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn tỉnh/thành phố!",
                },
              ]}
            >
              <Select
                showSearch
                placeholder="Chọn tỉnh/thành phố"
                loading={loadingProvinces}
                optionFilterProp="label"
                onChange={handleProvinceChange}
                notFoundContent={
                  loadingProvinces ? <Spin size="small" /> : "Không có dữ liệu"
                }
                options={provinces.map((item) => ({
                  label: item.name,
                  value: item.name,
                }))}
              />
            </Form.Item>
          </Col>

          {/* Phường/xã */}
          <Col xs={24} sm={12}>
            <Form.Item
              label="Phường/Xã"
              name="ward"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn phường/xã!",
                },
              ]}
            >
              <Select
                showSearch
                placeholder={
                  selectedProvince
                    ? "Chọn phường/xã"
                    : "Chọn tỉnh/thành phố trước"
                }
                disabled={!selectedProvince}
                loading={loadingWards}
                optionFilterProp="label"
                notFoundContent={
                  loadingWards ? <Spin size="small" /> : "Không có dữ liệu"
                }
                options={wards.map((item) => ({
                  label: item.name,
                  value: item.name,
                }))}
              />
            </Form.Item>
          </Col>

          {/* Địa chỉ */}
          <Col xs={24}>
            <Form.Item
              label="Địa chỉ chi tiết"
              name="address"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Vui lòng nhập địa chỉ chi tiết!",
                },
                {
                  max: 255,
                  message: "Địa chỉ không được vượt quá 255 ký tự!",
                },
              ]}
            >
              <Input placeholder="Số nhà, tên đường, ngõ..." maxLength={255} />
            </Form.Item>
          </Col>

          {/* Vị trí trên bản đồ */}
          <Col xs={24}>
            <div className="bf-geo">
              <div className="bf-geo__head">
                <span className="bf-geo__icon">
                  <EnvironmentOutlined />
                </span>

                <div className="bf-geo__text">
                  <b>
                    Vị trí trên bản đồ <em>(không bắt buộc)</em>
                  </b>
                  <span>Giúp người thuê tìm tòa nhà gần vị trí của họ.</span>
                </div>
              </div>

              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                  <Button
                    block
                    type="primary"
                    className="bf-btn-primary"
                    icon={<SearchOutlined />}
                    loading={findingCoords}
                    disabled={locating}
                    onClick={handleFindCoordinates}
                  >
                    Tìm từ địa chỉ
                  </Button>
                </Col>

                <Col xs={24} sm={12}>
                  <Button
                    block
                    icon={<AimOutlined />}
                    loading={locating}
                    disabled={findingCoords}
                    onClick={handleUseCurrentLocation}
                  >
                    Vị trí hiện tại
                  </Button>
                </Col>
              </Row>

              <Divider plain className="bf-geo__divider">
                hoặc dán tọa độ từ Google Maps
              </Divider>

              <Input
                allowClear
                value={pasteText}
                onChange={handlePasteCoordinates}
                prefix={<LinkOutlined style={{ color: "#8c8c8c" }} />}
                placeholder="10.7769, 106.7009 hoặc 21°01'45.2&quot;N 105°47'54.0&quot;E"
              />

              <Row gutter={[12, 0]} className="bf-geo__coords">
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Vĩ độ (latitude)"
                    name="latitude"
                    dependencies={["longitude"]}
                    rules={[requirePair("longitude", "vĩ độ")]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={-90}
                      max={90}
                      step={0.0001}
                      stringMode={false}
                      placeholder="10.7769000"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Kinh độ (longitude)"
                    name="longitude"
                    dependencies={["latitude"]}
                    rules={[requirePair("latitude", "kinh độ")]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={-180}
                      max={180}
                      step={0.0001}
                      stringMode={false}
                      placeholder="106.7009000"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {coordNote && (
                <Alert
                  showIcon
                  type={coordNote.type}
                  message={coordNote.message}
                  className="bf-geo__note"
                />
              )}

              {hasCoordinates && (
                <div>
                  <MapPreview lat={Number(latitude)} lng={Number(longitude)} />

                  <div className="bf-geo__foot">
                    <Text type="secondary">
                      {Number(latitude).toFixed(6)},{" "}
                      {Number(longitude).toFixed(6)}
                    </Text>

                    <Link
                      href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mở trên Google Maps để kiểm tra
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Col>

          {/* Mô tả */}
          <Col xs={24}>
            <Form.Item label="Mô tả" name="description">
              <TextArea
                rows={3}
                placeholder="Nhập mô tả về tòa nhà (không bắt buộc)"
                maxLength={1000}
                showCount
              />
            </Form.Item>
          </Col>

          {/* Tiện nghi: luôn 2 cột, kể cả trên điện thoại */}
          <Col xs={24}>
            <Form.Item label="Tiện nghi tòa nhà" name="amenities">
              <Checkbox.Group className="bf-amenities">
                {amenities.map((amenity) => (
                  <Checkbox
                    key={amenity.id}
                    value={amenity.id}
                    className="bf-amenity"
                  >
                    {amenity.name}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default BuildingForm;
