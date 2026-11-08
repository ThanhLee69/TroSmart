import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Col, Form, Grid, Input, Modal, Row, Select } from "antd";
import { CarOutlined, EditOutlined } from "@ant-design/icons";

import {
  createTenantVehicle,
  updateTenantVehicle,
  getAvailableTenants,
} from "../../../api/tenantVehicleApi";
import CommonSelect from "../../../components/CommonSelect";
import "./TenantVehicleForm.css";

const vehicleTypeOptions = [
  { value: "MOTORBIKE", label: "Xe máy" },
  { value: "ELECTRIC_BICYCLE", label: "Xe đạp điện" },
  { value: "BICYCLE", label: "Xe đạp" },
];

const TenantVehicleForm = ({
  isMode,
  record,
  isModal,
  hideModal,
  fetchVehicles,
  setLoading,
  notify,
  tenantId,
}) => {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [submitting, setSubmitting] = useState(false);

  const [tenantOptions, setTenantOptions] = useState([]);
  const [tenantLoading, setTenantLoading] = useState(false);

  const hasLoadedTenants = useRef(false);
  const requestIdRef = useRef(0);

  // TẢI DANH SÁCH KHÁCH THUÊ
  const loadTenants = useCallback(async () => {
    if (hasLoadedTenants.current) return;

    hasLoadedTenants.current = true;
    const requestId = ++requestIdRef.current;

    try {
      setTenantLoading(true);

      const response = await getAvailableTenants();

      if (requestId !== requestIdRef.current) return;

      const result = response?.result ?? response;

      const items = Array.isArray(result)
        ? result
        : result?.items || result?.content || [];

      setTenantOptions(
        items.map((tenant) => ({
          value: tenant.id,
          label: `${tenant.fullName || tenant.name || "Khách thuê"}${
            tenant.phone ? ` - ${tenant.phone}` : ""
          }`,
        })),
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      hasLoadedTenants.current = false;

      console.error("Load tenants error:", error);

      notify({
        type: "error",
        message: "Lỗi tải khách thuê",
        description:
          error?.response?.data?.message ||
          "Không thể tải danh sách khách thuê.",
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setTenantLoading(false);
      }
    }
  }, [notify]);

  // KHỞI TẠO FORM KHI MỞ MODAL
  useEffect(() => {
    if (!isModal) {
      form.resetFields();
      hasLoadedTenants.current = false;
      return;
    }

    if (isMode === "edit" && record) {
      form.setFieldsValue({
        vehicleType: record.vehicleType,
        licensePlate: record.licensePlate,
        brand: record.brand,
        color: record.color,
        note: record.note,
      });

      return;
    }

    form.resetFields();

    if (tenantId != null) {
      form.setFieldsValue({ tenantId });
    } else {
      loadTenants();
    }
  }, [isModal, isMode, record?.id, tenantId, form, loadTenants]);

  // THÊM MỚI / CẬP NHẬT
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        vehicleType: values.vehicleType,
        licensePlate: values.licensePlate.trim(),
        brand: values.brand?.trim() || null,
        color: values.color?.trim() || null,
        note: values.note?.trim() || null,
      };

      if (isMode === "edit") {
        // Giữ nguyên khách thuê hiện tại khi sửa thông tin xe.
        const currentTenantId =
          record?.tenantId ?? record?.tenant?.id ?? tenantId;

        if (currentTenantId == null) {
          notify({
            type: "error",
            message: "Thiếu thông tin khách thuê",
            description: "Không tìm thấy khách thuê của phương tiện này.",
          });
          return;
        }

        payload.tenantId = currentTenantId;
      } else {
        const selectedTenantId = tenantId ?? values.tenantId;

        if (selectedTenantId == null) {
          notify({
            type: "error",
            message: "Chưa chọn khách thuê",
            description: "Vui lòng chọn khách thuê trước khi thêm phương tiện.",
          });
          return;
        }

        payload.tenantId = selectedTenantId;
      }

      setLoading(true);
      setSubmitting(true);

      if (isMode === "edit") {
        const response = await updateTenantVehicle(record.id, payload);

        notify({
          type: "success",
          message: "Cập nhật thành công!",
          description: response?.message || "Cập nhật phương tiện thành công!",
        });
      } else {
        const response = await createTenantVehicle(payload);

        notify({
          type: "success",
          message: "Thêm thành công!",
          description: response?.message || "Thêm phương tiện thành công!",
        });
      }

      await fetchVehicles();
      hideModal();
      form.resetFields();
    } catch (error) {
      console.error("TenantVehicleForm error:", error);

      if (error?.errorFields) return;

      notify({
        type: "error",
        message: isMode === "edit" ? "Cập nhật thất bại!" : "Thêm thất bại!",
        description:
          error?.response?.data?.message ||
          "Đã xảy ra lỗi trong quá trình xử lý phương tiện.",
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const isEdit = isMode === "edit";

  return (
    <Modal
      className="tf-modal"
      title={
        <div className="tf-title">
          <span className="tf-title__icon">
            {isEdit ? <EditOutlined /> : <CarOutlined />}
          </span>
          <div>
            <div className="tf-title__main">
              {isEdit ? "Cập nhật phương tiện" : "Thêm phương tiện mới"}
            </div>
            <div className="tf-title__sub">
              {isEdit
                ? "Chỉnh sửa thông tin xe của khách thuê"
                : "Đăng ký xe cho khách thuê"}
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
        <div className={`tf-footer ${isMobile ? "is-mobile" : ""}`}>
          <Button block={isMobile} onClick={hideModal} disabled={submitting}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            block={isMobile}
            className="tf-btn-primary"
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
      >
        <Row gutter={[16, 0]}>
          {isMode !== "edit" && tenantId == null && (
            <Col xs={24}>
              <Form.Item
                label="Khách thuê"
                name="tenantId"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng chọn khách thuê!",
                  },
                ]}
              >
                <CommonSelect
                  options={tenantOptions}
                  loading={tenantLoading}
                  placeholder="Tìm và chọn khách thuê"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          )}

          <Col xs={24} sm={12}>
            <Form.Item
              label="Loại phương tiện"
              name="vehicleType"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn loại phương tiện!",
                },
              ]}
            >
              <Select
                placeholder="Chọn loại phương tiện"
                options={vehicleTypeOptions}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Biển số xe"
              name="licensePlate"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Vui lòng nhập biển số xe!",
                },
                {
                  max: 20,
                  message: "Biển số xe không được vượt quá 20 ký tự!",
                },
              ]}
            >
              <Input placeholder="Nhập biển số xe..." maxLength={20} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Hãng xe"
              name="brand"
              rules={[
                {
                  max: 100,
                  message: "Hãng xe không được vượt quá 100 ký tự!",
                },
              ]}
            >
              <Input
                placeholder="Ví dụ: Honda, Yamaha, VinFast..."
                maxLength={100}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label="Màu xe"
              name="color"
              rules={[
                {
                  max: 50,
                  message: "Màu xe không được vượt quá 50 ký tự!",
                },
              ]}
            >
              <Input placeholder="Nhập màu xe..." maxLength={50} />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              label="Ghi chú"
              name="note"
              rules={[
                {
                  max: 500,
                  message: "Ghi chú không được vượt quá 500 ký tự!",
                },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Nhập ghi chú về phương tiện..."
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default TenantVehicleForm;
