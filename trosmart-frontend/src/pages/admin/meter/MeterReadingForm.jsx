import React, { useEffect, useState } from "react";
import { Modal, Form, Input, InputNumber, DatePicker, Row, Col } from "antd";
import {
  ThunderboltOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  createMeterReading,
  updateMeterReading,
} from "../../../api/meterReadingApi";
import "./MeterReadingForm.css";

const fmt = (n) =>
  (n ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

// Định dạng tiền: 375,500 ₫ (dấu phẩy ngăn cách hàng nghìn)
const formatMoney = (n) =>
  `${Math.round(Number(n) || 0).toLocaleString("en-US")} ₫`;

const MeterBlock = ({
  kind,
  title,
  unit,
  icon,
  startName,
  endName,
  start,
  price,
}) => {
  const form = Form.useFormInstance();
  const end = Form.useWatch(endName, form);
  const watchedStart = Form.useWatch(startName, form);
  const startValue = start ?? watchedStart;

  const hasPrice = price !== null && price !== undefined;
  const hasEnd = end !== null && end !== undefined && end !== "";
  const use = hasEnd && startValue != null ? end - startValue : null;
  const invalid = use !== null && use < 0;
  const ready = use !== null && !invalid;

  let note = "Chưa nhập";
  let noteClass = "";
  if (invalid) {
    note = `Nhỏ hơn chỉ số cũ (${fmt(startValue)})`;
    noteClass = "is-error";
  } else if (ready) {
    note = "Hợp lệ";
    noteClass = "is-ok";
  }

  return (
    <section className="mr-block">
      <div className="mr-block__head">
        <span className={`mr-block__icon mr-block__icon--${kind}`}>{icon}</span>
        <h3>{title}</h3>
      </div>

      <div className="mr-block__grid">
        {start != null ? (
          <Form.Item
            className="mr-fld"
            label={<span className="mr-lbl">Chỉ số cũ</span>}
            help={<span className="mr-hint">Lấy từ kỳ trước</span>}
          >
            <div className="mr-readonly">{fmt(start)}</div>
          </Form.Item>
        ) : (
          <Form.Item
            className="mr-fld"
            label={<span className="mr-lbl">Chỉ số cũ</span>}
            name={startName}
            rules={[{ required: true, message: "Nhập chỉ số đầu kỳ" }]}
            extra={<span className="mr-hint">Phòng chưa có kỳ trước</span>}
          >
            <InputNumber
              min={0}
              precision={0}
              controls={false}
              placeholder="Nhập chỉ số"
            />
          </Form.Item>
        )}

        <Form.Item
          className="mr-fld"
          label={<span className="mr-lbl">Chỉ số mới</span>}
          name={endName}
          dependencies={[startName]}
          validateStatus={invalid ? "error" : undefined}
          help={<span className={`mr-note ${noteClass}`}>{note}</span>}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, v) {
                const st = start ?? getFieldValue(startName);
                return v == null || st == null || v >= st
                  ? Promise.resolve()
                  : Promise.reject(new Error("Nhỏ hơn chỉ số cũ"));
              },
            }),
          ]}
        >
          <InputNumber
            min={0}
            precision={0}
            controls={false}
            placeholder="Nhập chỉ số"
          />
        </Form.Item>
      </div>

      <div className={`mr-use mr-use--${kind}`}>
        <span>
          Tiêu thụ {ready ? fmt(use) : "—"} {unit}
        </span>
        {hasPrice && <b>{ready ? formatMoney(use * price) : "—"}</b>}
      </div>
    </section>
  );
};

const MeterReadingForm = ({
  isMode,
  record,
  isModal,
  hideModal,
  fetchMeterReadings,
  notify,
  setLoading,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEdit = isMode === "edit";

  const month = record?.billingMonth ?? dayjs().month() + 1;
  const year = record?.billingYear ?? dayjs().year();

  const lockedElecStart = record?.electricityStart ?? null;
  const lockedWaterStart = record?.waterStart ?? null;

  // Nạp dữ liệu mỗi lần mở form
  useEffect(() => {
    if (!isModal) return;
    form.resetFields();
    form.setFieldsValue({
      electricityStart: record?.electricityStart ?? undefined,
      electricityEnd: isEdit
        ? (record?.electricityEnd ?? undefined)
        : undefined,
      waterStart: record?.waterStart ?? undefined,
      waterEnd: isEdit ? (record?.waterEnd ?? undefined) : undefined,
      recordedDate: record?.recordedDate ? dayjs(record.recordedDate) : dayjs(),
      note: isEdit ? record?.note : undefined,
    });
  }, [isModal, isEdit, record, form]);

  const handleSubmit = async () => {
    if (saving) return;

    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // lỗi validate: form tự hiển thị
    }

    // Bỏ field trống để backend tự xử lý (tạo mới: tự lấy chỉ số đầu kỳ trước)
    const payload = {
      electricityStart: values.electricityStart ?? undefined,
      electricityEnd: values.electricityEnd ?? undefined,
      waterStart: values.waterStart ?? undefined,
      waterEnd: values.waterEnd ?? undefined,
      recordedDate: values.recordedDate
        ? values.recordedDate.format("YYYY-MM-DD")
        : undefined,
      note: values.note?.trim() || undefined,
    };

    setSaving(true);
    setLoading?.(true);

    try {
      if (isEdit) {
        await updateMeterReading(record.id, payload);
      } else {
        await createMeterReading({
          roomId: record.roomId,
          billingMonth: record.billingMonth,
          billingYear: record.billingYear,
          ...payload,
        });
      }

      notify?.({
        type: "success",
        message: isEdit
          ? "Cập nhật chỉ số thành công!"
          : "Lưu chỉ số điện nước thành công!",
      });

      await fetchMeterReadings?.();
      hideModal();
    } catch (error) {
      console.error("MeterReadingForm error:", error);
      notify?.({
        type: "error",
        message: isEdit
          ? "Cập nhật chỉ số thất bại!"
          : "Lưu chỉ số điện nước thất bại!",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra lại dữ liệu và thử lại.",
      });
    } finally {
      setSaving(false);
      setLoading?.(false);
    }
  };

  const handleCancel = () => {
    if (saving) return;
    hideModal();
  };

  const subtitle = [
    record?.roomNumber ? `Phòng ${record.roomNumber}` : null,
    record?.buildingName,
    record?.tenantName,
    `Kỳ ${month}/${year}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Modal
      className="mr-modal"
      open={isModal}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={isEdit ? "Lưu thay đổi" : "Lưu chỉ số"}
      cancelText="Hủy"
      confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }}
      closable={!saving}
      closeIcon={<CloseOutlined />}
      maskClosable={!saving}
      keyboard={!saving}
      width="min(720px, calc(100vw - 24px))"
      centered
      destroyOnHidden
      title={
        <div className="mr-title">
          {isEdit ? "Cập nhật chỉ số điện nước" : "Nhập chỉ số điện nước"}
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        autoComplete="off"
        className="mr-form"
      >
        <div className="mr-info">
          <InfoCircleOutlined />
          <span>{subtitle}</span>
        </div>

        <MeterBlock
          kind="elec"
          title="Điện"
          unit="kWh"
          icon={<ThunderboltOutlined />}
          startName="electricityStart"
          endName="electricityEnd"
          start={lockedElecStart}
          price={record?.electricityPrice}
        />

        <MeterBlock
          kind="water"
          title="Nước"
          unit="m³"
          icon={<ExperimentOutlined />}
          startName="waterStart"
          endName="waterEnd"
          start={lockedWaterStart}
          price={record?.waterPrice}
        />

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12}>
            <Form.Item
              label={
                <span className="mr-lbl">
                  Ngày ghi <i>*</i>
                </span>
              }
              name="recordedDate"
              rules={[{ required: true, message: "Chọn ngày ghi" }]}
            >
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                disabledDate={(date) => date.isAfter(dayjs(), "day")}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              label={<span className="mr-lbl">Ghi chú</span>}
              name="note"
            >
              <Input
                maxLength={300}
                placeholder="VD: Thay đồng hồ, đọc lại lần 2"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default MeterReadingForm;
