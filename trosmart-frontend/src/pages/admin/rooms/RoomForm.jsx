import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Checkbox,
  Segmented,
  Button,
  Spin,
  Empty,
  Grid,
  message,
} from "antd";

import {
  InfoCircleOutlined,
  FileImageOutlined,
  HomeOutlined,
  EditOutlined,
} from "@ant-design/icons";

import ImageUploader from "./RoomImageUpload";

import { getRoomAmenities } from "../../../api/amenityApi";
import { createRoom, updateRoom } from "../../../api/roomApi";
import {
  deleteRoomImage,
  uploadRoomImages,
  setRoomThumbnail,
} from "../../../api/roomImageApi";
import { getBuildingOptions } from "../../../api/buildingApi";
import CommonSelect from "../../../components/CommonSelect";
import "./RoomForm.css";

const { TextArea } = Input;

// Loại phòng, giá trị khớp enum RoomType ở backend
const ROOM_TYPE_OPTIONS = [
  { value: "STANDARD", label: "Phòng thường" },
  { value: "LOFT", label: "Phòng gác lửng" },
  { value: "STUDIO", label: "Studio" },
  { value: "MINI_APARTMENT", label: "Căn hộ mini" },
];

const MAX_IMAGES = 9;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/* =========================================================
   CHUẨN HÓA RESPONSE
========================================================= */

const unwrapResponse = (response) => {
  let data = response;

  for (let i = 0; i < 5; i += 1) {
    if (data == null) return null;
    if (Array.isArray(data)) return data;
    if (typeof data !== "object") return data;

    if ("result" in data && data.result != null) {
      data = data.result;
      continue;
    }

    if ("data" in data && data.data != null) {
      data = data.data;
      continue;
    }

    break;
  }

  return data;
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.result?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

/* =========================================================
   CHUẨN HÓA ID TIỆN NGHI
========================================================= */

const getAmenityId = (item) => {
  if (item == null) return null;

  if (typeof item === "number" || typeof item === "string") {
    if (String(item).trim() === "") return null;

    const id = Number(item);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  if (typeof item !== "object") return null;

  const directId =
    item.id ??
    item.amenityId ??
    item.amenityID ??
    item.value ??
    item.amenity_id;

  if (directId != null && directId !== "") {
    const id = Number(directId);

    if (Number.isInteger(id) && id > 0) return id;
  }

  const nestedCandidates = [
    item.amenity,
    item.roomAmenity,
    item.roomAmenity?.amenity,
    item.amenityInfo,
    item.amenityDetail,
  ];

  for (const candidate of nestedCandidates) {
    if (candidate && candidate !== item) {
      const id = getAmenityId(candidate);
      if (id != null) return id;
    }
  }

  return null;
};

const normalizeAmenityIds = (value) => {
  if (value == null || value === "") return [];

  let items = value;

  if (items instanceof Set) {
    items = Array.from(items);
  } else if (!Array.isArray(items)) {
    if (typeof items === "object" && Array.isArray(items.value)) {
      items = items.value;
    } else {
      items = [items];
    }
  }

  return [...new Set(items.map(getAmenityId).filter((id) => id != null))];
};

const getAmenityIdsByNames = (names, amenityList) => {
  if (!Array.isArray(names) || !Array.isArray(amenityList)) {
    return [];
  }

  const normalizedNames = new Set(
    names
      .map((item) => {
        if (typeof item === "string") {
          return item.trim().toLowerCase();
        }

        return (item?.name ?? item?.amenityName ?? item?.amenity?.name ?? "")
          .trim()
          .toLowerCase();
      })
      .filter(Boolean),
  );

  return normalizeAmenityIds(
    amenityList
      .filter((item) =>
        normalizedNames.has(
          String(item?.name ?? item?.amenityName ?? "")
            .trim()
            .toLowerCase(),
        ),
      )
      .map(getAmenityId),
  );
};

const getRoomAmenityIds = (room, amenityList = []) => {
  if (!room) return [];

  const possibleIdFields = [
    room.amenityIds,
    room.amenitiesIds,
    room.roomAmenityIds,
    room.amenityIdList,
  ];

  for (const value of possibleIdFields) {
    const ids = normalizeAmenityIds(value);
    if (ids.length > 0) return ids;
  }

  const possibleObjectFields = [
    room.amenities,
    room.roomAmenities,
    room.roomAmenityList,
    room.amenityList,
    room.roomAmenityResponses,
  ];

  for (const value of possibleObjectFields) {
    const ids = normalizeAmenityIds(value);
    if (ids.length > 0) return ids;
  }

  const names = room.amenityNames ?? room.amenityNameList ?? room.amenitiesName;

  return getAmenityIdsByNames(names, amenityList);
};

/* =========================================================
   XỬ LÝ ẢNH
========================================================= */

const getImageId = (image) =>
  image?.id ?? image?.imageId ?? image?.roomImageId ?? null;

const getImageUrl = (image) =>
  image?.imageUrl ??
  image?.url ??
  image?.secureUrl ??
  image?.imageUrlPath ??
  image?.image_url ??
  "";

const getCreatedRoomId = (response) => {
  const data = unwrapResponse(response);

  const candidates = [
    data?.id,
    data?.roomId,
    data?.room?.id,
    data?.room?.roomId,
    data?.content?.id,
    data?.content?.roomId,
    data?.data?.id,
    data?.data?.roomId,
  ];

  for (const value of candidates) {
    if (value != null && value !== "") return value;
  }

  return null;
};

/**
 * Chuẩn hóa danh sách ảnh trả về sau upload.
 * Backend uploadImages hiện trả về List<RoomImageResponse>.
 */
const getUploadedImageList = (response) => {
  const data = unwrapResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.images)) return data.images;
  if (Array.isArray(data?.roomImages)) return data.roomImages;

  return [];
};

/* =========================================================
   ROOM FORM
========================================================= */

const RoomForm = ({
  isMode,
  record,
  hideModal,
  isModal,
  fetchRooms,
  notify,
  buildings = [],
  loadDashboard,
}) => {
  const [form] = Form.useForm();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(false);
  const [amenities, setAmenities] = useState([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);

  const [tab, setTab] = useState("info");
  const [fileList, setFileList] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);

  // Lưu UID ảnh được chọn làm đại diện.
  // Với ảnh mới, UID vẫn tồn tại trước khi ảnh có ID trong database.
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);

  const notifyRef = useRef(notify);
  const initializedRecordRef = useRef(null);
  const loadingRef = useRef(false);
  const createdRoomIdRef = useRef(null);

  const isEdit = isMode === "edit";

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  /* =======================================================
     THÔNG BÁO
  ======================================================= */

  const showNotify = useCallback((config) => {
    if (notifyRef.current) {
      notifyRef.current(config);
      return;
    }

    const type = config?.type || "error";

    const content = config?.description
      ? `${config.message} ${config.description}`
      : config?.message;

    if (type === "success") {
      message.success(content);
    } else if (type === "warning") {
      message.warning(content);
    } else {
      message.error(content);
    }
  }, []);

  /* =======================================================
     TẢI TIỆN NGHI
  ======================================================= */

  useEffect(() => {
    let active = true;

    const fetchAmenities = async () => {
      setAmenitiesLoading(true);

      try {
        const response = await getRoomAmenities();
        const data = unwrapResponse(response);

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
            ? data.content
            : Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.records)
                ? data.records
                : [];

        if (active) setAmenities(list);
      } catch (error) {
        if (active) {
          showNotify({
            type: "error",
            message: "Không thể tải danh sách tiện ích phòng.",
            description: getErrorMessage(
              error,
              "Vui lòng kiểm tra kết nối và thử lại.",
            ),
          });
        }
      } finally {
        if (active) setAmenitiesLoading(false);
      }
    };

    fetchAmenities();

    return () => {
      active = false;
    };
  }, [showNotify]);

  /* =======================================================
     RESET FORM
  ======================================================= */

  const resetForm = useCallback(() => {
    form.resetFields();

    setFileList([]);
    setDeletedIds([]);
    setSelectedThumbnail(null);
    setTab("info");

    initializedRecordRef.current = null;
    createdRoomIdRef.current = null;
  }, [form]);

  const closeModal = useCallback(() => {
    if (loadingRef.current) return;

    resetForm();
    hideModal?.();
  }, [hideModal, resetForm]);

  /* =======================================================
     KHỞI TẠO FORM KHI MỞ MODAL
  ======================================================= */

  useEffect(() => {
    if (!isModal) {
      if (!loadingRef.current) resetForm();
      return;
    }

    const recordKey = isEdit
      ? (record?.id ?? record?.roomId ?? record)
      : "create";

    if (initializedRecordRef.current === recordKey) return;

    initializedRecordRef.current = recordKey;
    createdRoomIdRef.current = null;

    setSelectedThumbnail(null);

    if (!isEdit || !record) {
      form.resetFields();

      form.setFieldsValue({
        roomNumber: "",
        buildingId: undefined,
        floor: 1,
        area: undefined,
        rentalPrice: undefined,
        maxOccupancy: 1,
        roomType: undefined,
        description: "",
        amenities: [],
      });

      setFileList([]);
      setDeletedIds([]);
      setTab("info");
      return;
    }

    const buildingId =
      record.buildingId ??
      record.building?.id ??
      buildings.find((building) => building.name === record.buildingName)?.id;

    const roomAmenities = getRoomAmenityIds(record, amenities);

    form.resetFields();

    form.setFieldsValue({
      roomNumber: record.roomNumber ?? "",
      buildingId: buildingId != null ? Number(buildingId) : undefined,
      floor: record.floor ?? 1,
      area: record.area ?? undefined,
      rentalPrice: record.rentalPrice ?? undefined,
      maxOccupancy: record.maxOccupancy ?? 1,
      roomType: record.roomType,
      description: record.description ?? "",
      amenities: roomAmenities,
    });

    const images = Array.isArray(record.images)
      ? record.images
      : Array.isArray(record.roomImages)
        ? record.roomImages
        : Array.isArray(record.roomImageList)
          ? record.roomImageList
          : [];

    const oldFiles = images.filter(Boolean).map((image, index) => ({
      uid: `old-${getImageId(image) ?? index}`,
      id: getImageId(image),
      name: image?.name ?? `room-image-${index + 1}`,
      status: "done",
      url: getImageUrl(image),
      isThumbnail: image?.isThumbnail ?? image?.thumbnail ?? false,
    }));

    setFileList(oldFiles);

    const thumbnail = oldFiles.find((image) => image.isThumbnail);
    setSelectedThumbnail(thumbnail?.uid ?? null);

    setDeletedIds([]);
    setTab("info");
  }, [isModal, isEdit, record, buildings, amenities, form, resetForm]);

  /* =======================================================
     BỔ SUNG TIỆN NGHI KHI DANH SÁCH TẢI XONG
  ======================================================= */

  useEffect(() => {
    if (
      !isModal ||
      !isEdit ||
      !record ||
      amenitiesLoading ||
      amenities.length === 0
    ) {
      return;
    }

    const currentIds = getRoomAmenityIds(record, amenities);
    if (currentIds.length === 0) return;

    const currentFormIds = normalizeAmenityIds(form.getFieldValue("amenities"));

    const sameIds =
      currentIds.length === currentFormIds.length &&
      currentIds.every((id) => currentFormIds.includes(id));

    if (!sameIds) {
      form.setFieldsValue({ amenities: currentIds });
    }
  }, [isModal, isEdit, record, amenities, amenitiesLoading, form]);

  /* =======================================================
     XÓA ẢNH TRÊN GIAO DIỆN
  ======================================================= */

  const handleRemoveImage = useCallback(
    (file) => {
      if (loadingRef.current) return false;

      if (file?.id != null) {
        setDeletedIds((previous) =>
          previous.includes(file.id) ? previous : [...previous, file.id],
        );
      }

      setFileList((previous) =>
        previous.filter((item) => item.uid !== file.uid),
      );

      if (selectedThumbnail === file.uid) {
        setSelectedThumbnail(null);
      }

      return true;
    },
    [selectedThumbnail],
  );

  /* =======================================================
     CHỌN ẢNH ĐẠI DIỆN
  ======================================================= */

  const handleSetThumbnail = useCallback(
    async (file) => {
      if (!file) return false;

      // Ảnh chưa upload: chỉ ghi nhớ lựa chọn.
      // API sẽ được gọi sau khi ảnh có ID trong database.
      if (file.id == null) {
        setSelectedThumbnail(file.uid);
        return true;
      }

      const roomId = record?.id ?? record?.roomId;

      if (roomId == null) {
        message.warning("Không tìm thấy ID phòng.");
        return false;
      }

      try {
        await setRoomThumbnail(roomId, file.id);

        setSelectedThumbnail(file.uid);

        setFileList((previous) =>
          previous.map((item) => ({
            ...item,
            isThumbnail: String(item.id) === String(file.id),
          })),
        );

        message.success("Đã đổi ảnh đại diện.");

        return true;
      } catch (error) {
        message.error(getErrorMessage(error, "Không thể đổi ảnh đại diện."));

        return false;
      }
    },
    [record],
  );

  /* =======================================================
     TẠO PAYLOAD
  ======================================================= */

  const buildPayload = (values) => ({
    roomNumber: String(values.roomNumber ?? "").trim(),
    buildingId: Number(values.buildingId),
    roomType: values.roomType,
    floor: Number(values.floor),
    area: Number(values.area),
    rentalPrice: Number(values.rentalPrice),
    maxOccupancy: Number(values.maxOccupancy),
    description: String(values.description ?? "").trim(),
    amenityIds: normalizeAmenityIds(values.amenities),
  });

  /* =======================================================
     LẤY ẢNH MỚI
  ======================================================= */

  const getNewUploadItems = () =>
    fileList.filter((file) => file.originFileObj && file.id == null);

  /* =======================================================
     KIỂM TRA ẢNH
  ======================================================= */

  const validateImages = () => {
    if (fileList.length > MAX_IMAGES) {
      throw new Error(`Mỗi phòng chỉ được có tối đa ${MAX_IMAGES} ảnh.`);
    }

    const oversizedFile = getNewUploadItems().find(
      (item) => item.originFileObj.size > MAX_IMAGE_SIZE,
    );

    if (oversizedFile) {
      throw new Error("Mỗi ảnh không được vượt quá 5 MB.");
    }
  };

  /* =======================================================
     LÀM MỚI DỮ LIỆU
  ======================================================= */

  const refreshData = async () => {
    const results = await Promise.allSettled([
      Promise.resolve().then(() => fetchRooms?.()),
      Promise.resolve().then(() => loadDashboard?.()),
    ]);

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Không thể làm mới dữ liệu:", result.reason);
      }
    });
  };

  /* =======================================================
     LƯU PHÒNG VÀ XỬ LÝ ẢNH
  ======================================================= */

  const handleSubmit = async () => {
    if (loadingRef.current) return;

    let roomSaved = false;
    let savedRoomId = null;

    try {
      const values = await form.validateFields();

      validateImages();

      loadingRef.current = true;
      setLoading(true);

      const payload = buildPayload(values);

      /* Tạo hoặc cập nhật phòng. */
      if (isEdit) {
        savedRoomId = record?.id ?? record?.roomId;

        if (savedRoomId == null) {
          throw new Error("Không tìm thấy ID phòng cần cập nhật.");
        }

        await updateRoom(savedRoomId, payload);
        roomSaved = true;
      } else if (createdRoomIdRef.current != null) {
        // Tránh tạo phòng trùng nếu lần trước upload ảnh lỗi.
        savedRoomId = createdRoomIdRef.current;

        await updateRoom(savedRoomId, payload);
        roomSaved = true;
      } else {
        const response = await createRoom(payload);

        savedRoomId = getCreatedRoomId(response);

        if (savedRoomId == null) {
          throw new Error("Không lấy được ID phòng từ response API tạo phòng.");
        }

        createdRoomIdRef.current = savedRoomId;
        roomSaved = true;
      }

      /* Xóa ảnh cũ được đánh dấu xóa. */
      if (isEdit && deletedIds.length > 0) {
        for (const imageId of deletedIds) {
          await deleteRoomImage(savedRoomId, imageId);
        }
      }

      /*
       * Lưu lại lựa chọn trước khi upload.
       * UID giúp xác định ảnh nào người dùng chọn làm đại diện.
       */
      const thumbnailUid = selectedThumbnail;
      const newUploadItems = getNewUploadItems();

      /* Upload ảnh mới. */
      if (newUploadItems.length > 0) {
        const filesToUpload = newUploadItems.map((item) => item.originFileObj);

        const uploadResponse = await uploadRoomImages(
          savedRoomId,
          filesToUpload,
        );

        const uploadedImages = getUploadedImageList(uploadResponse);

        /*
         * Nếu người dùng chọn một ảnh mới làm đại diện,
         * tìm ảnh tương ứng trong danh sách backend trả về.
         */
        const selectedNewIndex = newUploadItems.findIndex(
          (item) => String(item.uid) === String(thumbnailUid),
        );

        if (selectedNewIndex >= 0) {
          const uploadedThumbnail = uploadedImages[selectedNewIndex];
          const uploadedThumbnailId = getImageId(uploadedThumbnail);

          if (uploadedThumbnailId == null) {
            throw new Error(
              "Ảnh đã upload nhưng không lấy được ID ảnh để đặt làm đại diện. " +
                "Kiểm tra response của API uploadRoomImages.",
            );
          }

          // Backend đã tự chọn ảnh đầu tiên khi phòng chưa có đại diện.
          // Chỉ gọi API khi ảnh người dùng chọn không phải ảnh đó.
          const alreadyThumbnail =
            uploadedThumbnail?.isThumbnail === true ||
            uploadedThumbnail?.thumbnail === true;

          if (!alreadyThumbnail) {
            await setRoomThumbnail(savedRoomId, uploadedThumbnailId);
          }
        }
      }

      showNotify({
        type: "success",
        message: isEdit
          ? "Cập nhật phòng thành công!"
          : "Thêm phòng thành công!",
      });

      resetForm();
      hideModal?.();

      await refreshData();
    } catch (error) {
      if (error?.errorFields) {
        setTab("info");
        return;
      }

      console.error("Lưu phòng thất bại:", error);

      showNotify({
        type: "error",
        message: roomSaved
          ? "Thông tin phòng đã lưu nhưng xử lý ảnh chưa hoàn tất."
          : isEdit
            ? "Không thể cập nhật phòng."
            : "Không thể thêm phòng.",
        description: getErrorMessage(
          error,
          "Vui lòng kiểm tra dữ liệu và thử lại.",
        ),
      });

      if (roomSaved) {
        await refreshData();
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  /* =======================================================
     NÚT THAO TÁC
  ======================================================= */

  const submitButton = (
    <Button
      key="submit"
      type="primary"
      block={isMobile}
      onClick={handleSubmit}
      loading={loading}
      disabled={loading}
      className="tf-btn-primary"
    >
      {isEdit ? "Cập nhật" : "Thêm mới"}
    </Button>
  );

  const footerButtons = [
    <Button
      key="cancel"
      block={isMobile}
      onClick={closeModal}
      disabled={loading}
    >
      Hủy bỏ
    </Button>,
    submitButton,
  ];

  /* =======================================================
     GIAO DIỆN
  ======================================================= */

  return (
    <Modal
      className="tf-modal"
      title={
        <div className="tf-title">
          <span className="tf-title__icon">
            {isEdit ? <EditOutlined /> : <HomeOutlined />}
          </span>
          <div>
            <div className="tf-title__main">
              {isEdit ? "Cập nhật phòng" : "Thêm phòng mới"}
            </div>
            <div className="tf-title__sub">
              {isEdit
                ? "Chỉnh sửa thông tin, tiện nghi và ảnh phòng"
                : "Nhập thông tin, tiện nghi và ảnh phòng"}
            </div>
          </div>
        </div>
      }
      open={isModal}
      onCancel={closeModal}
      destroyOnHidden
      width={isMobile ? "calc(100vw - 24px)" : 720}
      centered
      maskClosable={!loading}
      closable={!loading}
      keyboard={!loading}
      styles={{ body: { maxHeight: "calc(100dvh - 210px)" } }}
      footer={
        <div className={`tf-footer ${isMobile ? "is-mobile" : ""}`}>
          {tab === "info" ? (
            footerButtons
          ) : (
            <>
              <Button
                key="back"
                block={isMobile}
                onClick={() => setTab("info")}
                disabled={loading}
              >
                Quay lại
              </Button>

              {submitButton}
            </>
          )}
        </div>
      }
    >
      <Spin spinning={loading} tip="Đang lưu dữ liệu...">
        <Segmented
          block
          size="middle"
          value={tab}
          onChange={setTab}
          options={[
            {
              value: "info",
              label: "Thông tin",
              icon: <InfoCircleOutlined />,
            },
            {
              value: "images",
              label: "Ảnh phòng",
              icon: <FileImageOutlined />,
            },
          ]}
          className="tf-tabs"
        />

        <Form
          form={form}
          layout="vertical"
          disabled={loading}
          scrollToFirstError
          requiredMark={false}
          preserve
        >
          <div
            style={{
              display: tab === "info" ? "block" : "none",
            }}
          >
            <div className="tf-sec">Thông tin phòng</div>

            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Mã phòng"
                  name="roomNumber"
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Vui lòng nhập mã phòng!",
                    },
                    {
                      max: 50,
                      message: "Mã phòng tối đa 50 ký tự.",
                    },
                  ]}
                >
                  <Input placeholder="Ví dụ: A301" maxLength={50} />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  label="Tòa nhà"
                  name="buildingId"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn tòa nhà!",
                    },
                  ]}
                >
                  <CommonSelect
                    placeholder="Chọn tòa nhà"
                    options={buildings.map((building) => ({
                      value: building.id,
                      label: building.name,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Tầng"
                  name="floor"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập tầng!",
                    },
                    {
                      type: "number",
                      min: 0,
                      message: "Tầng không được âm.",
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    precision={0}
                    style={{ width: "100%" }}
                    placeholder="Tầng"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8}>
                <Form.Item
                  label="Diện tích (m²)"
                  name="area"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập diện tích!",
                    },
                    {
                      type: "number",
                      min: 0.01,
                      message: "Diện tích phải lớn hơn 0.",
                    },
                  ]}
                >
                  <InputNumber
                    min={0.01}
                    style={{ width: "100%" }}
                    placeholder="Diện tích"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8}>
                <Form.Item
                  label="Giá thuê (₫/tháng)"
                  name="rentalPrice"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập giá thuê!",
                    },
                    {
                      type: "number",
                      min: 0,
                      message: "Giá thuê không được âm.",
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    precision={0}
                    style={{ width: "100%" }}
                    placeholder="Giá thuê"
                    formatter={(value) =>
                      value == null
                        ? ""
                        : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value?.replace(/,/g, "") ?? ""}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Sức chứa tối đa"
                  name="maxOccupancy"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập sức chứa!",
                    },
                    {
                      type: "number",
                      min: 1,
                      message: "Sức chứa tối thiểu là 1 người.",
                    },
                  ]}
                >
                  <InputNumber
                    min={1}
                    precision={0}
                    style={{ width: "100%" }}
                    placeholder="Số người"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  label="Loại phòng"
                  name="roomType"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn loại phòng!",
                    },
                  ]}
                >
                  <Select
                    allowClear
                    placeholder="Chọn loại phòng"
                    options={ROOM_TYPE_OPTIONS.map((item) => ({
                      label: item.label,
                      value: item.value,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <div className="tf-sec">Mô tả và tiện nghi</div>

            <Form.Item
              label="Mô tả"
              name="description"
              rules={[
                {
                  max: 2000,
                  message: "Mô tả không được vượt quá 2000 ký tự.",
                },
              ]}
            >
              <TextArea
                rows={isMobile ? 3 : 4}
                maxLength={2000}
                showCount
                placeholder="Nhập mô tả phòng..."
              />
            </Form.Item>

            <Form.Item label="Tiện nghi phòng">
              <Spin spinning={amenitiesLoading}>
                {amenities.length > 0 ? (
                  <Form.Item name="amenities" noStyle>
                    <Checkbox.Group
                      className="rf-amenities"
                      style={{ width: "100%" }}
                    >
                      <Row gutter={[10, 10]}>
                        {amenities.map((item) => (
                          <Col
                            xs={12}
                            sm={8}
                            key={getAmenityId(item)}
                            style={{ minWidth: 0 }}
                          >
                            <Checkbox value={getAmenityId(item)}>
                              {item.name || item.amenityName}
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </Form.Item>
                ) : (
                  !amenitiesLoading && <Empty description="Chưa có tiện nghi" />
                )}
              </Spin>
            </Form.Item>

            {isEdit && (
              <div className="tf-hint">
                <InfoCircleOutlined />
                <span>
                  Muốn đổi trạng thái phòng, hãy sử dụng thao tác trạng thái
                  trong danh sách phòng.
                </span>
              </div>
            )}
          </div>
        </Form>

        {tab === "images" && (
          <div className="tf-identity">
            <ImageUploader
              fileList={fileList}
              setFileList={setFileList}
              onRemove={handleRemoveImage}
              onSetThumbnail={handleSetThumbnail}
              maxCount={MAX_IMAGES}
              disabled={loading}
            />

            <div className="tf-hint">
              <InfoCircleOutlined />
              <span>
                Tối đa {MAX_IMAGES} ảnh mỗi phòng. Hệ thống chấp nhận các định
                dạng ảnh được backend hỗ trợ; mỗi ảnh tối đa 5 MB.
              </span>
            </div>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default RoomForm;
