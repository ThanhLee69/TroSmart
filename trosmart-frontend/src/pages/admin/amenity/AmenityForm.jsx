import React, { useEffect, useState } from "react";
import { Button, Col, Form, Grid, Input, Modal, Row, Select } from "antd";
import { EditOutlined, AppstoreAddOutlined } from "@ant-design/icons";

import { createAmenity, updateAmenity } from "../../../api/amenityApi";
import "./AmenityPage.css";

const SCOPE_OPTIONS = [
  { value: "BUILDING", label: "Tòa nhà" },
  { value: "ROOM", label: "Phòng" },
  { value: "BOTH", label: "Cả hai" },
];

const AmenityForm = ({
  isMode,
  record,
  isModal,
  hideModal,
  fetchAmenities,
  setLoading,
  notify,
}) => {
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [submitting, setSubmitting] = useState(false);

  const isEdit = isMode === "edit";

  useEffect(() => {
    if (!isModal) {
      form.resetFields();
      return;
    }

    if (isEdit && record) {
      form.setFieldsValue({
        name: record.name,
        description: record.description,
        scope: record.scope,
      });
    } else {
      form.resetFields();
    }
  }, [isModal, isEdit, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        scope: values.scope,
      };

      setLoading(true);
      setSubmitting(true);

      const response = isEdit
        ? await updateAmenity(record.id, payload)
        : await createAmenity(payload);

      notify({
        type: "success",
        message: isEdit ? "Cập nhật thành công!" : "Thêm thành công!",
        description:
          response?.message ||
          (isEdit
            ? "Cập nhật tiện ích thành công!"
            : "Thêm tiện ích thành công!"),
      });

      await fetchAmenities();
      hideModal();
      form.resetFields();
    } catch (error) {
      console.error("AmenityForm error:", error);

      // Không hiện thông báo nếu chỉ là lỗi validate form
      if (error?.errorFields) return;

      notify({
        type: "error",
        message: isEdit ? "Cập nhật thất bại!" : "Thêm thất bại!",
        description:
          error?.response?.data?.message ||
          "Đã xảy ra lỗi trong quá trình xử lý tiện ích.",
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      className="af-modal"
      title={
        <div className="af-title">
          <span className="af-title__icon">
            {isEdit ? <EditOutlined /> : <AppstoreAddOutlined />}
          </span>
          <div>
            <div className="af-title__main">
              {isEdit ? "Cập nhật tiện ích" : "Thêm tiện ích mới"}
            </div>
            <div className="af-title__sub">
              {isEdit
                ? "Chỉnh sửa thông tin tiện ích"
                : "Thiết lập tiện ích cho tòa nhà và phòng"}
            </div>
          </div>
        </div>
      }
      open={isModal}
      onCancel={() => {
        if (!submitting) hideModal();
      }}
      centered
      width={isMobile ? "calc(100vw - 24px)" : 520}
      maskClosable={!submitting}
      closable={!submitting}
      styles={{ body: { maxHeight: "calc(100dvh - 210px)" } }}
      footer={
        <div className={`af-footer ${isMobile ? "is-mobile" : ""}`}>
          <Button block={isMobile} onClick={hideModal} disabled={submitting}>
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            block={isMobile}
            className="af-btn-primary"
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
          <Col xs={24}>
            <Form.Item
              label="Tên tiện ích"
              name="name"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Vui lòng nhập tên tiện ích!",
                },
                {
                  max: 100,
                  message: "Tên tiện ích không được vượt quá 100 ký tự!",
                },
              ]}
            >
              <Input
                placeholder="Ví dụ: Wi-Fi, điều hòa, camera..."
                maxLength={100}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              label="Phạm vi áp dụng"
              name="scope"
              rules={[
                { required: true, message: "Vui lòng chọn phạm vi áp dụng!" },
              ]}
            >
              <Select
                placeholder="Chọn phạm vi áp dụng"
                options={SCOPE_OPTIONS}
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
            <Form.Item
              label="Mô tả"
              name="description"
              rules={[
                {
                  max: 500,
                  message: "Mô tả không được vượt quá 500 ký tự!",
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder="Nhập mô tả về tiện ích..."
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

export default AmenityForm;
