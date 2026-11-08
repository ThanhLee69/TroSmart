import React, { useEffect, useState } from "react";
import {
  Button,
  Col,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Switch,
} from "antd";
import { EditOutlined, LockOutlined, ToolOutlined } from "@ant-design/icons";

import { createService, updateService } from "../../../api/serviceApi";
import "./ServiceForm.css";

const BILLING_TYPE_OPTIONS = [
  { value: "USAGE", label: "Theo mức sử dụng" },
  { value: "FIXED_MONTHLY", label: "Cố định theo tháng" },
  { value: "PER_PERSON", label: "Theo số người" },
];

// Dịch vụ hệ thống (ServiceCode): chỉ được cập nhật đơn giá
const PROTECTED_SERVICE_CODES = ["ELECTRICITY", "WATER", "PARKING"];

// Ô nhập tiền: hiển thị 100,000 và đọc ngược về số
const moneyFormatter = (value) =>
  `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const moneyParser = (value) => (value || "").replace(/,/g, "");

const BILLING_LABELS = Object.fromEntries(
  BILLING_TYPE_OPTIONS.map((item) => [item.value, item.label]),
);

const ServiceForm = ({
  isMode,
  record,
  isModal,
  hideModal,
  fetchServices,
  setLoading,
  notify,
}) => {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [submitting, setSubmitting] = useState(false);

  const isEdit = isMode === "edit";
  const isProtected =
    isEdit && PROTECTED_SERVICE_CODES.includes(record?.serviceCode);

  useEffect(() => {
    if (!isModal) {
      form.resetFields();
      return;
    }

    if (isEdit && record) {
      form.setFieldsValue({
        name: record.name,
        unitPrice: record.unitPrice,
        unit: record.unit,
        billingType: record.billingType,
        defaultService: record.defaultService ?? false,
        description: record.description,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ defaultService: false });
    }
  }, [isModal, isEdit, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Dịch vụ hệ thống: giữ nguyên mọi thông tin, chỉ đổi đơn giá
      const payload = isProtected
        ? {
            name: record.name,
            unitPrice: Number(values.unitPrice),
            unit: record.unit,
            billingType: record.billingType,
            serviceType: record.serviceCode,
            defaultService: record.defaultService ?? false,
            description: record.description ?? null,
          }
        : {
            name: values.name.trim(),
            unitPrice: Number(values.unitPrice),
            unit: values.unit.trim(),
            billingType: values.billingType,
            serviceType: isEdit ? (record?.serviceCode ?? null) : null,
            defaultService: values.defaultService ?? false,
            description: values.description?.trim() || null,
          };

      setLoading(true);
      setSubmitting(true);

      const response = isEdit
        ? await updateService(record.id, payload)
        : await createService(payload);

      notify({
        type: "success",
        message: isEdit ? "Cập nhật thành công!" : "Thêm thành công!",
        description:
          response?.message ||
          (isEdit
            ? "Cập nhật dịch vụ thành công!"
            : "Thêm dịch vụ thành công!"),
      });

      await fetchServices();
      hideModal();
      form.resetFields();
    } catch (error) {
      console.error("ServiceForm error:", error);

      if (error?.errorFields) return;

      notify({
        type: "error",
        message: isEdit ? "Cập nhật thất bại!" : "Thêm thất bại!",
        description:
          error?.response?.data?.message ||
          "Đã xảy ra lỗi trong quá trình xử lý dịch vụ.",
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const priceField = (
    <Form.Item
      label="Đơn giá"
      name="unitPrice"
      rules={[
        { required: true, message: "Vui lòng nhập đơn giá!" },
        {
          type: "number",
          min: 0,
          message: "Đơn giá phải lớn hơn hoặc bằng 0!",
        },
      ]}
    >
      <InputNumber
        className="sf-money"
        style={{ width: "100%" }}
        min={0}
        precision={0}
        placeholder="Nhập đơn giá"
        addonAfter="đ"
        formatter={moneyFormatter}
        parser={moneyParser}
      />
    </Form.Item>
  );

  return (
    <Modal
      className="sf-modal"
      title={
        <div className="sf-title">
          <span className="sf-title__icon">
            {isEdit ? <EditOutlined /> : <ToolOutlined />}
          </span>
          <div>
            <div className="sf-title__main">
              {isEdit ? "Cập nhật dịch vụ" : "Thêm dịch vụ mới"}
            </div>
            <div className="sf-title__sub">
              {isProtected
                ? "Dịch vụ hệ thống chỉ được đổi đơn giá"
                : isEdit
                  ? "Chỉnh sửa thông tin dịch vụ"
                  : "Thiết lập dịch vụ và đơn giá áp dụng"}
            </div>
          </div>
        </div>
      }
      open={isModal}
      onCancel={() => {
        if (!submitting) hideModal();
      }}
      centered
      width={isMobile ? "calc(100vw - 24px)" : 560}
      maskClosable={!submitting}
      closable={!submitting}
      styles={{ body: { maxHeight: "calc(100dvh - 210px)" } }}
      footer={
        <div className={`sf-footer ${isMobile ? "is-mobile" : ""}`}>
          <Button block={isMobile} onClick={hideModal} disabled={submitting}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            block={isMobile}
            className="sf-btn-primary"
            loading={submitting}
            onClick={handleSubmit}
          >
            {isEdit ? "Cập nhật" : "Thêm mới"}
          </Button>
        </div>
      }
      destroyOnHidden
    >
      <Form
        layout="vertical"
        form={form}
        requiredMark={false}
        disabled={submitting}
        initialValues={{ defaultService: false }}
      >
        {isProtected ? (
          <>
            <div className="sf-lock">
              <span className="sf-lock__icon">
                <LockOutlined />
              </span>
              <div className="sf-lock__text">
                <b>{record.name}</b>
                <span>
                  {[record.unit, BILLING_LABELS[record.billingType]]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </div>

            {priceField}

            <div className="sf-hint">
              Tên, đơn vị tính và cách tính phí của dịch vụ hệ thống được cố
              định, không chỉnh sửa được.
            </div>
          </>
        ) : (
          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item
                label="Tên dịch vụ"
                name="name"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Vui lòng nhập tên dịch vụ!",
                  },
                  {
                    max: 100,
                    message: "Tên dịch vụ không được vượt quá 100 ký tự!",
                  },
                ]}
              >
                <Input
                  placeholder="Ví dụ: Wi-Fi, vệ sinh, giặt sấy..."
                  maxLength={100}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              {priceField}
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label="Đơn vị tính"
                name="unit"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: "Vui lòng nhập đơn vị tính!",
                  },
                  {
                    max: 30,
                    message: "Đơn vị tính không được vượt quá 30 ký tự!",
                  },
                ]}
              >
                <Input placeholder="Ví dụ: tháng, người, lần" maxLength={30} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label="Cách tính phí"
                name="billingType"
                rules={[
                  { required: true, message: "Vui lòng chọn cách tính phí!" },
                ]}
              >
                <Select
                  placeholder="Chọn cách tính phí"
                  options={BILLING_TYPE_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <div className="sf-switch">
                <div className="sf-switch__text">
                  <b>Dịch vụ mặc định</b>
                  <span>Tự được chọn sẵn khi tạo hợp đồng mới.</span>
                </div>
                <Form.Item
                  name="defaultService"
                  valuePropName="checked"
                  noStyle
                >
                  <Switch checkedChildren="Có" unCheckedChildren="Không" />
                </Form.Item>
              </div>
            </Col>

            <Col xs={24}>
              <Form.Item
                label="Mô tả"
                name="description"
                rules={[
                  {
                    max: 1000,
                    message: "Mô tả không được vượt quá 1000 ký tự!",
                  },
                ]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Nhập mô tả về dịch vụ..."
                  maxLength={1000}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>
    </Modal>
  );
};

export default ServiceForm;
