import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Row,
  Col,
  DatePicker,
  Select,
  Upload,
  Button,
  Image,
  Typography,
  Grid,
  Spin,
  Segmented,
  Radio,
} from "antd";
import {
  IdcardOutlined,
  UserOutlined,
  UserAddOutlined,
  EditOutlined,
  UploadOutlined,
  InfoCircleOutlined,
  ScanOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  createTenant,
  updateTenant,
  updateTenantIdentityImages,
} from "../../../api/tenantApi";
import { parseCccdQr, readQrFromImageFile } from "../../../utils/cccdQr";
import "./TenantForm.css";

const { TextArea } = Input;
const { Text } = Typography;

const REQUIRED_LABEL = ({ children }) => (
  <span>
    {children} <span style={{ color: "#ff4d4f" }}>*</span>
  </span>
);

const TenantForm = ({
  isMode,
  record,
  hideModal,
  isModal,
  fetchTenants,
  notify,
}) => {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [tab, setTab] = useState("info");
  const [loading, setLoading] = useState(false);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [scanning, setScanning] = useState(false);

  const loadingRef = useRef(false);
  const frontImageUrlRef = useRef(null);
  const backImageUrlRef = useRef(null);

  const isEdit = isMode === "edit";

  // Giải phóng URL xem trước ảnh khi ảnh thay đổi hoặc component bị hủy.
  const clearPreviewUrl = useCallback((imageRef) => {
    if (imageRef.current) {
      URL.revokeObjectURL(imageRef.current);
      imageRef.current = null;
    }
  }, []);

  const resetForm = useCallback(() => {
    form.resetFields();
    setTab("info");

    clearPreviewUrl(frontImageUrlRef);
    clearPreviewUrl(backImageUrlRef);

    setFrontImage(null);
    setBackImage(null);
  }, [form, clearPreviewUrl]);

  const closeModal = useCallback(() => {
    if (loadingRef.current) return;

    resetForm();
    hideModal?.();
  }, [hideModal, resetForm]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    if (!isModal) return;

    resetForm();

    if (isEdit && record) {
      form.setFieldsValue({
        fullName: record.fullName,
        phone: record.phone,
        email: record.email,
        identityNumber: record.identityNumber,
        identityIssuedDate: record.identityIssuedDate
          ? dayjs(record.identityIssuedDate)
          : null,
        dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
        gender: record.gender,
        permanentAddress: record.permanentAddress,
        occupation: record.occupation,
        note: record.note,
      });
    }
  }, [isModal, isEdit, record, form, resetForm]);

  useEffect(() => {
    return () => {
      clearPreviewUrl(frontImageUrlRef);
      clearPreviewUrl(backImageUrlRef);
    };
  }, [clearPreviewUrl]);

  const handleSelectImage = (file, setImage, imageRef) => {
    clearPreviewUrl(imageRef);
    imageRef.current = URL.createObjectURL(file);
    setImage(file);

    // Ngăn Upload tự gửi request; ảnh sẽ được gửi khi lưu form.
    return false;
  };

  const handleRemoveImage = (setImage, imageRef) => {
    clearPreviewUrl(imageRef);
    setImage(null);
  };

  // Đọc mã QR trên ảnh CCCD vừa chọn rồi điền vào tab Thông tin.
  // Chỉ điền những trường đọc được; người dùng vẫn xem lại và sửa trước khi lưu.
  const handleScanIdentity = async () => {
    const files = [frontImage, backImage].filter(Boolean);

    if (files.length === 0) {
      notify?.({
        type: "warning",
        message: "Chưa có ảnh CCCD",
        description: "Hãy chọn ảnh mặt trước CCCD trước khi đọc thông tin.",
      });
      return;
    }

    setScanning(true);

    try {
      // Thử lần lượt từng ảnh đã chọn, lấy ảnh đầu tiên có mã QR đúng của CCCD
      let parsed = null;
      let foundQr = false;

      for (const file of files) {
        const text = await readQrFromImageFile(file);

        if (text) {
          foundQr = true;
          // Chỉ ghi ở console của trình duyệt để dò lỗi định dạng
          console.info("Nội dung mã QR đọc được:", text);
        }

        parsed = parseCccdQr(text);

        if (parsed) break;
      }

      if (!parsed) {
        notify?.({
          type: "error",
          message: foundQr
            ? "Mã QR không đúng định dạng CCCD"
            : "Không tìm thấy mã QR trong ảnh",
          description: foundQr
            ? "Đã đọc được một mã QR nhưng nội dung không giống CCCD. Mở Console của trình duyệt để xem nội dung."
            : "Ảnh cần rõ nét, thấy đủ mã QR ở CCCD gắn chip. Có thể chọn cả hai mặt. Thẻ cũ không có mã QR, bạn nhập tay giúp.",
        });
        return;
      }

      const values = {};

      if (parsed.identityNumber) values.identityNumber = parsed.identityNumber;
      if (parsed.fullName) values.fullName = parsed.fullName;
      if (parsed.dateOfBirth) values.dateOfBirth = dayjs(parsed.dateOfBirth);
      if (parsed.gender) values.gender = parsed.gender;
      if (parsed.permanentAddress) {
        values.permanentAddress = parsed.permanentAddress;
      }
      if (parsed.identityIssuedDate) {
        values.identityIssuedDate = dayjs(parsed.identityIssuedDate);
      }

      form.setFieldsValue(values);
      setTab("info");

      notify?.({
        type: "success",
        message: "Đã đọc thông tin từ CCCD",
        description:
          "Vui lòng kiểm tra lại các ô đã điền, rồi bổ sung số điện thoại.",
      });
    } catch (error) {
      console.error("Lỗi đọc mã QR CCCD:", error);

      notify?.({
        type: "error",
        message: "Không đọc được ảnh",
        description: "Vui lòng thử lại với ảnh khác.",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (loadingRef.current) return;

    try {
      const values = await form.validateFields();

      setLoading(true);
      loadingRef.current = true;

      const payload = {
        fullName: values.fullName?.trim(),
        phone: values.phone?.trim(),
        email: values.email?.trim() || null,
        identityNumber: values.identityNumber?.trim() || null,
        identityIssuedDate: values.identityIssuedDate
          ? values.identityIssuedDate.format("YYYY-MM-DD")
          : null,
        dateOfBirth: values.dateOfBirth
          ? values.dateOfBirth.format("YYYY-MM-DD")
          : null,
        gender: values.gender || null,
        permanentAddress: values.permanentAddress?.trim() || null,
        occupation: values.occupation?.trim() || null,
        note: values.note?.trim() || null,
      };

      let tenantId = record?.id;

      if (isEdit) {
        if (!tenantId) {
          throw new Error("Không tìm thấy ID khách thuê cần cập nhật.");
        }

        const formData = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
          formData.append(
            key,
            value === null || value === undefined ? "" : String(value),
          );
        });

        await updateTenant(tenantId, formData);
      } else {
        const response = await createTenant(payload);

        // Hỗ trợ các cấu trúc response thường gặp.
        const result =
          response?.result ??
          response?.data?.result ??
          response?.data ??
          response;

        tenantId =
          result?.id ??
          result?.tenantId ??
          result?.tenant?.id ??
          result?.tenant?.tenantId;

        // Nếu API không trả ID, lấy lại danh sách để tìm khách thuê vừa tạo.
        if (!tenantId && (frontImage || backImage)) {
          const refreshed = await fetchTenants?.();

          const tenantList =
            refreshed?.content ??
            refreshed?.items ??
            refreshed?.records ??
            refreshed?.result?.content ??
            refreshed?.result?.items ??
            [];

          const createdTenant = tenantList.find(
            (tenant) =>
              tenant.phone === payload.phone &&
              tenant.fullName === payload.fullName,
          );

          tenantId = createdTenant?.id;
        }

        if ((frontImage || backImage) && !tenantId) {
          throw new Error(
            "Khách thuê đã được tạo nhưng không lấy được ID để tải ảnh CCCD. Hãy kiểm tra response của API tạo khách thuê.",
          );
        }
      }

      // Chỉ gọi API tải ảnh khi đã có ID và có ảnh được chọn.
      if (tenantId && (frontImage || backImage)) {
        await updateTenantIdentityImages(tenantId, frontImage, backImage);
      }

      notify?.({
        type: "success",
        message: isEdit
          ? "Cập nhật khách thuê thành công!"
          : "Thêm khách thuê thành công!",
      });

      await fetchTenants?.();
      resetForm();
      hideModal?.();
    } catch (error) {
      if (error?.errorFields) {
        setTab("info");
        return;
      }

      notify?.({
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Có lỗi xảy ra trong quá trình xử lý.",
      });
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const renderIdentityUpload = ({
    title,
    imageUrl,
    imageFile,
    setImageFile,
    imageRef,
    side,
  }) => {
    const previewUrl = imageFile ? imageRef.current : null;

    return (
      <div className="tf-up">
        <Text strong className="tf-up__title">
          {title}
        </Text>

        <div className={`tf-up__box ${imageFile || imageUrl ? "has-img" : ""}`}>
          {imageFile && previewUrl ? (
            <Image src={previewUrl} alt={title} className="tf-up__img" />
          ) : imageUrl ? (
            <Image src={imageUrl} alt={title} className="tf-up__img" />
          ) : (
            <div className="tf-up__empty">
              <IdcardOutlined />
              <span>Chưa có ảnh CCCD</span>
            </div>
          )}
        </div>

        <Upload
          accept="image/*"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(file) =>
            handleSelectImage(file, setImageFile, imageRef)
          }
        >
          <Button icon={<UploadOutlined />} block disabled={loading}>
            {imageFile ? "Chọn ảnh khác" : "Chọn ảnh"}
          </Button>
        </Upload>

        {imageFile && (
          <Button
            type="link"
            danger
            block
            disabled={loading}
            onClick={() => handleRemoveImage(setImageFile, imageRef)}
          >
            Bỏ ảnh đã chọn
          </Button>
        )}

        <span className="tf-up__side">
          {side === "front" ? "Mặt trước CCCD" : "Mặt sau CCCD"}
        </span>
      </div>
    );
  };

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

  return (
    <Modal
      className="tf-modal"
      title={
        <div className="tf-title">
          <span className="tf-title__icon">
            {isEdit ? <EditOutlined /> : <UserAddOutlined />}
          </span>
          <div>
            <div className="tf-title__main">
              {isEdit ? "Cập nhật khách thuê" : "Thêm khách thuê mới"}
            </div>
            <div className="tf-title__sub">
              {isEdit
                ? "Chỉnh sửa hồ sơ và ảnh CCCD"
                : "Nhập thông tin hồ sơ và ảnh CCCD"}
            </div>
          </div>
        </div>
      }
      open={isModal}
      onCancel={closeModal}
      destroyOnHidden
      centered
      width={isMobile ? "calc(100vw - 24px)" : 760}
      maskClosable={!loading}
      closable={!loading}
      keyboard={!loading}
      styles={{
        body: { maxHeight: "calc(100dvh - 210px)" },
      }}
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
              value: "identity",
              label: "Ảnh CCCD",
              icon: <IdcardOutlined />,
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
          <div style={{ display: tab === "info" ? "block" : "none" }}>
            <Row gutter={[16, 0]}>
              {/* 1. THÔNG TIN LIÊN HỆ */}
              <Col xs={24}>
                <div className="tf-sec">Thông tin liên hệ</div>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="fullName"
                  label={<REQUIRED_LABEL>Họ và tên</REQUIRED_LABEL>}
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Vui lòng nhập họ và tên!",
                    },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="Nhập họ và tên"
                    maxLength={150}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="phone"
                  label={<REQUIRED_LABEL>Số điện thoại</REQUIRED_LABEL>}
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: "Vui lòng nhập số điện thoại!",
                    },
                  ]}
                >
                  <Input placeholder="Nhập số điện thoại" maxLength={20} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    {
                      type: "email",
                      message: "Email không đúng định dạng!",
                    },
                  ]}
                >
                  <Input placeholder="Nhập email" maxLength={150} />
                </Form.Item>
              </Col>

              {/* 2. THÔNG TIN CÁ NHÂN */}
              <Col xs={24}>
                <div className="tf-sec">Thông tin cá nhân</div>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item name="dateOfBirth" label="Ngày sinh">
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: "100%" }}
                    placeholder="Chọn ngày sinh"
                    disabledDate={(date) => date.isAfter(dayjs(), "day")}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item name="gender" label="Giới tính">
                  <Radio.Group
                    options={[
                      { label: "Nam", value: "MALE" },
                      { label: "Nữ", value: "FEMALE" },
                    ]}
                    optionType="button"
                    buttonStyle="solid"
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item name="occupation" label="Nghề nghiệp">
                  <Input placeholder="Nhập nghề nghiệp" maxLength={150} />
                </Form.Item>
              </Col>

              {/* 3. GIẤY TỜ TÙY THÂN (dùng khi lập hợp đồng) */}
              <Col xs={24}>
                <div className="tf-sec">Giấy tờ tùy thân (CCCD)</div>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item name="identityNumber" label="Số CCCD">
                  <Input placeholder="Nhập số CCCD" maxLength={30} />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item
                  name="identityIssuedDate"
                  label="Ngày cấp"
                  dependencies={["dateOfBirth"]}
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const birth = getFieldValue("dateOfBirth");

                        if (!value || !birth || value.isAfter(birth, "day")) {
                          return Promise.resolve();
                        }

                        return Promise.reject(
                          new Error("Ngày cấp phải sau ngày sinh"),
                        );
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    style={{ width: "100%" }}
                    placeholder="Chọn ngày cấp CCCD"
                    disabledDate={(date) => date.isAfter(dayjs(), "day")}
                  />
                </Form.Item>
              </Col>

              {/* 4. ĐỊA CHỈ VÀ GHI CHÚ */}
              <Col xs={24}>
                <div className="tf-sec">Địa chỉ và ghi chú</div>
              </Col>

              <Col xs={24}>
                <Form.Item name="permanentAddress" label="Địa chỉ thường trú">
                  <Input
                    placeholder="Nhập địa chỉ thường trú"
                    maxLength={500}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item name="note" label="Ghi chú">
                  <TextArea
                    rows={isMobile ? 3 : 4}
                    placeholder="Nhập ghi chú nếu có"
                    maxLength={1000}
                    showCount
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>

        {tab === "identity" && (
          <div className="tf-identity">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                {renderIdentityUpload({
                  title: "CCCD mặt trước",
                  imageUrl: record?.identityFrontImage,
                  imageFile: frontImage,
                  setImageFile: setFrontImage,
                  imageRef: frontImageUrlRef,
                  side: "front",
                })}
              </Col>

              <Col xs={24} sm={12}>
                {renderIdentityUpload({
                  title: "CCCD mặt sau",
                  imageUrl: record?.identityBackImage,
                  imageFile: backImage,
                  setImageFile: setBackImage,
                  imageRef: backImageUrlRef,
                  side: "back",
                })}
              </Col>
            </Row>

            <Button
              block
              className="tf-scan-btn"
              icon={<ScanOutlined />}
              loading={scanning}
              disabled={loading || scanning || (!frontImage && !backImage)}
              onClick={handleScanIdentity}
            >
              Đọc thông tin từ ảnh
            </Button>

            <div className="tf-hint">
              <InfoCircleOutlined />
              <span>
                Ảnh CCCD không bắt buộc. Chọn ảnh mặt trước CCCD gắn chip rồi
                bấm "Đọc thông tin từ ảnh" để tự điền số CCCD, họ tên, ngày
                sinh, giới tính, địa chỉ và ngày cấp. Khi chỉnh sửa, ảnh hiện
                tại được giữ nguyên nếu không chọn ảnh mới.
              </span>
            </div>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default TenantForm;
