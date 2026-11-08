import React, { useEffect, useRef, useState } from "react";
import {
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Segmented,
  Select,
  Spin,
} from "antd";
import {
  BellOutlined,
  ClockCircleOutlined,
  EditOutlined,
  InfoCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  createNotification,
  getNotificationById,
  getNotificationTargetOptions,
  sendNotification,
  updateNotification,
} from "../../../api/notificationApi";
import { useNotify } from "../../../components/NotificationProvider";
import {
  API_DATE_TIME_FORMAT,
  DISPLAY_DATE_TIME_FORMAT,
  NOTIFICATION_PRIORITY_OPTIONS,
  NOTIFICATION_TARGET_OPTIONS,
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_TYPE_OPTIONS,
} from "./notificationConstants";
import "./NotificationDialogs.css";

const { TextArea } = Input;

// Lấy gợi ý đối tượng nhận: tòa nhà đang hoạt động, phòng đang có người ở,
// khách đang thuê và đã có tài khoản
const fetchTargetOptions = async (type, keyword) => {
  if (!type || type === "ALL") return [];

  return getNotificationTargetOptions({
    targetType: type,
    keyword: keyword?.trim() || undefined,
  });
};

const SEARCH_DEBOUNCE_MS = 300;

// Cách gửi
const MODE_DRAFT = "DRAFT";
const MODE_NOW = "NOW";
const MODE_SCHEDULE = "SCHEDULE";

const MODE_OPTIONS = [
  { value: MODE_DRAFT, label: "Lưu nháp" },
  { value: MODE_NOW, label: "Gửi ngay" },
  { value: MODE_SCHEDULE, label: "Hẹn giờ gửi" },
];

const MODE_META = {
  [MODE_DRAFT]: {
    icon: <EditOutlined />,
    label: "Lưu nháp",
    hint: "Lưu lại, gửi sau",
  },
  [MODE_NOW]: {
    icon: <SendOutlined />,
    label: "Gửi ngay",
    hint: "Đến khách ngay lập tức",
  },
  [MODE_SCHEDULE]: {
    icon: <ClockCircleOutlined />,
    label: "Hẹn giờ",
    hint: "Tự gửi khi đến giờ",
  },
};

// Loại thông báo: chấm màu thay cho thẻ màu
const TYPE_SELECT_OPTIONS = NOTIFICATION_TYPE_OPTIONS.map((option) => ({
  value: option.value,
  label: (
    <span className="nt-opt">
      <i
        className={`nt-dot nt-tone--${NOTIFICATION_TYPE_COLORS[option.value] || "default"}`}
      />
      {option.label}
    </span>
  ),
}));

// Ba thẻ chọn cách gửi, dùng được trực tiếp trong Form.Item (value / onChange)
const ModeCards = ({ value, onChange, disabled }) => (
  <div className="nt-modes" role="radiogroup" aria-label="Cách gửi">
    {MODE_OPTIONS.map((option) => {
      const meta = MODE_META[option.value];
      const active = value === option.value;

      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={active}
          disabled={disabled}
          className={`nt-mode ${active ? "is-active" : ""}`}
          onClick={() => onChange?.(option.value)}
        >
          <span className="nt-mode__icon">{meta.icon}</span>
          <span className="nt-mode__text">
            <b>{meta.label}</b>
            <span>{meta.hint}</span>
          </span>
        </button>
      );
    })}
  </div>
);

const SectionTitle = ({ children }) => (
  <div className="nt-section">{children}</div>
);

const TARGET_PLACEHOLDER = {
  BUILDING: "Tìm tên hoặc địa chỉ tòa nhà",
  ROOM: "Tìm số phòng hoặc tên tòa (phòng đang có người ở)",
  TENANT: "Tìm tên hoặc số điện thoại (khách đã có tài khoản)",
};

const TARGET_LABEL = {
  BUILDING: "Tòa nhà",
  ROOM: "Phòng",
  TENANT: "Khách thuê",
};

const SUBMIT_TEXT = {
  [MODE_DRAFT]: "Lưu nháp",
  [MODE_NOW]: "Gửi thông báo",
  [MODE_SCHEDULE]: "Hẹn giờ gửi",
};

const INITIAL_VALUES = {
  type: "ANNOUNCEMENT",
  priority: "NORMAL",
  targetType: "ALL",
  mode: MODE_NOW,
};

// Lấy id đối tượng theo targetType từ chi tiết thông báo
const pickTargetId = (detail) => {
  if (detail.targetType === "BUILDING") return detail.buildingId;
  if (detail.targetType === "ROOM") return detail.roomId;
  if (detail.targetType === "TENANT") return detail.tenantId;
  return undefined;
};

/**
 * Modal soạn / sửa thông báo.
 * - notificationId = null: soạn mới
 * - notificationId có giá trị: sửa (chỉ nháp hoặc đang hẹn giờ)
 */
const NotificationFormModal = ({ open, notificationId, onClose, onSaved }) => {
  const { notify, contextHolder } = useNotify();
  const [form] = Form.useForm();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const isEdit = !!notificationId;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [targetOptions, setTargetOptions] = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);

  const searchTimer = useRef(null);
  // Bỏ qua kết quả của lần tìm đã cũ khi người dùng gõ tiếp hoặc đổi đối tượng
  const searchSeq = useRef(0);

  const targetType = Form.useWatch("targetType", form);
  const mode = Form.useWatch("mode", form) || MODE_NOW;

  // =========================
  // TẢI GỢI Ý ĐỐI TƯỢNG NHẬN
  // =========================
  const loadTargetOptions = async (type, keyword) => {
    if (!type || type === "ALL") {
      setTargetOptions([]);
      return;
    }

    const seq = ++searchSeq.current;
    setTargetLoading(true);

    try {
      const data = await fetchTargetOptions(type, keyword);

      if (seq !== searchSeq.current) return;

      setTargetOptions(data ?? []);
    } catch (error) {
      if (seq !== searchSeq.current) return;

      setTargetOptions([]);

      notifyRef.current({
        type: "error",
        message: "Không thể tải danh sách đối tượng nhận",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      if (seq === searchSeq.current) setTargetLoading(false);
    }
  };

  const handleSearchTarget = (keyword) => {
    window.clearTimeout(searchTimer.current);

    searchTimer.current = window.setTimeout(() => {
      loadTargetOptions(form.getFieldValue("targetType"), keyword);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleTargetTypeChange = (value) => {
    // Đổi kiểu đối tượng thì bỏ lựa chọn cũ và tải lại gợi ý
    form.setFieldsValue({ targetId: undefined });
    setTargetOptions([]);
    loadTargetOptions(value, "");
  };

  // =========================
  // MỞ MODAL: NẠP DỮ LIỆU
  // =========================
  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    form.resetFields();
    setTargetOptions([]);

    if (!notificationId) {
      return undefined;
    }

    const loadDetail = async () => {
      setLoading(true);

      try {
        const detail = await getNotificationById(notificationId);

        if (cancelled) return;

        const targetId = pickTargetId(detail);

        // Giữ lựa chọn hiện tại hiển thị đúng tên dù chưa tìm kiếm
        if (targetId) {
          setTargetOptions([
            {
              value: targetId,
              label: detail.targetName,
            },
          ]);
        }

        form.setFieldsValue({
          title: detail.title,
          content: detail.content,
          type: detail.type,
          priority: detail.priority,
          targetType: detail.targetType,
          targetId,
          mode: detail.status === "SCHEDULED" ? MODE_SCHEDULE : MODE_DRAFT,
          scheduledAt: detail.scheduledAt
            ? dayjs(detail.scheduledAt)
            : undefined,
        });
      } catch (error) {
        if (cancelled) return;

        notifyRef.current({
          type: "error",
          message: "Không thể tải thông báo",
          description:
            error?.response?.data?.message || "Vui lòng thử lại sau.",
        });

        onClose?.();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notificationId]);

  useEffect(
    () => () => {
      window.clearTimeout(searchTimer.current);
    },
    [],
  );

  // =========================
  // LƯU
  // =========================
  const handleSubmit = async () => {
    let values;

    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = {
      title: values.title.trim(),
      content: values.content.trim(),
      type: values.type,
      priority: values.priority,
      targetType: values.targetType,
      buildingId:
        values.targetType === "BUILDING" ? values.targetId : undefined,
      roomId: values.targetType === "ROOM" ? values.targetId : undefined,
      tenantId: values.targetType === "TENANT" ? values.targetId : undefined,
      // Không có scheduledAt = lưu nháp
      scheduledAt:
        values.mode === MODE_SCHEDULE && values.scheduledAt
          ? values.scheduledAt.format(API_DATE_TIME_FORMAT)
          : undefined,
    };

    setSubmitting(true);

    let saved;

    try {
      saved = isEdit
        ? await updateNotification(notificationId, payload)
        : await createNotification(payload);
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: isEdit
          ? "Cập nhật thông báo thất bại!"
          : "Soạn thông báo thất bại!",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });

      setSubmitting(false);
      return;
    }

    // Đã lưu thành công, bước gửi ngay có thể lỗi riêng (vd không có người nhận)
    if (values.mode === MODE_NOW) {
      try {
        const sent = await sendNotification(saved.id);

        notifyRef.current({
          type: "success",
          message: "Đã gửi thông báo!",
          description: `Gửi tới ${sent?.recipientCount ?? 0} khách thuê`,
        });
      } catch (error) {
        notifyRef.current({
          type: "warning",
          message: "Đã lưu nháp nhưng chưa gửi được",
          description:
            error?.response?.data?.message ||
            "Bạn có thể mở thông báo trong danh sách để gửi lại.",
        });
      }
    } else {
      notifyRef.current({
        type: "success",
        message:
          values.mode === MODE_SCHEDULE
            ? "Đã hẹn giờ gửi thông báo!"
            : "Đã lưu nháp thông báo!",
      });
    }

    setSubmitting(false);
    onSaved?.(saved);
  };

  const closeIfIdle = () => {
    if (!submitting) onClose?.();
  };

  return (
    <>
      {contextHolder}

      <Modal
        open={open}
        className="nt-modal"
        title={
          <div className="nt-title">
            <span className="nt-title__icon">
              <BellOutlined />
            </span>
            <div>
              <h3>{isEdit ? "Sửa thông báo" : "Soạn thông báo"}</h3>
              <p>Gửi tới khách đang thuê trong nhà trọ</p>
            </div>
          </div>
        }
        onCancel={closeIfIdle}
        maskClosable={false}
        destroyOnClose
        width="min(720px, calc(100vw - 24px))"
        okText={SUBMIT_TEXT[mode]}
        cancelText="Đóng"
        confirmLoading={submitting}
        okButtonProps={{ disabled: loading }}
        onOk={handleSubmit}
        style={{ top: 24 }}
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={INITIAL_VALUES}
            disabled={submitting}
          >
            <Form.Item
              name="title"
              label="Tiêu đề"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Vui lòng nhập tiêu đề",
                },
                { max: 200, message: "Tiêu đề tối đa 200 ký tự" },
              ]}
            >
              <Input
                placeholder="VD: Thông báo cắt nước ngày 05/11"
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Form.Item
              name="content"
              label="Nội dung"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Vui lòng nhập nội dung",
                },
                { max: 5000, message: "Nội dung tối đa 5000 ký tự" },
              ]}
            >
              <TextArea
                rows={5}
                maxLength={5000}
                showCount
                placeholder="Nội dung gửi tới khách thuê"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="type"
                  label="Loại thông báo"
                  rules={[
                    { required: true, message: "Vui lòng chọn loại thông báo" },
                  ]}
                >
                  <Select options={TYPE_SELECT_OPTIONS} />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12}>
                <Form.Item name="priority" label="Mức ưu tiên">
                  <Segmented block options={NOTIFICATION_PRIORITY_OPTIONS} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={targetType === "ALL" ? 24 : 12}>
                <Form.Item
                  name="targetType"
                  label="Gửi cho"
                  rules={[
                    { required: true, message: "Vui lòng chọn đối tượng nhận" },
                  ]}
                >
                  <Select
                    options={NOTIFICATION_TARGET_OPTIONS}
                    onChange={handleTargetTypeChange}
                  />
                </Form.Item>
              </Col>

              {targetType && targetType !== "ALL" && (
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="targetId"
                    label={TARGET_LABEL[targetType]}
                    rules={[
                      {
                        required: true,
                        message: `Vui lòng chọn ${TARGET_LABEL[targetType].toLowerCase()}`,
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      allowClear
                      filterOption={false}
                      loading={targetLoading}
                      placeholder={TARGET_PLACEHOLDER[targetType]}
                      onSearch={handleSearchTarget}
                      onFocus={() => {
                        if (targetOptions.length === 0) {
                          loadTargetOptions(targetType, "");
                        }
                      }}
                      notFoundContent={
                        targetLoading ? <Spin size="small" /> : "Không tìm thấy"
                      }
                      options={targetOptions.map((option) => ({
                        value: option.value,
                        label: option.description
                          ? `${option.label} · ${option.description}`
                          : option.label,
                      }))}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>

            <SectionTitle>Cách gửi</SectionTitle>

            <Form.Item name="mode">
              <ModeCards disabled={submitting} />
            </Form.Item>

            {mode === MODE_SCHEDULE && (
              <Form.Item
                name="scheduledAt"
                label="Thời gian gửi"
                rules={[
                  { required: true, message: "Vui lòng chọn thời gian gửi" },
                  {
                    validator: (_, value) =>
                      !value || value.isAfter(dayjs())
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error("Thời gian gửi phải ở tương lai"),
                          ),
                  },
                ]}
              >
                <DatePicker
                  showTime={{ format: "HH:mm" }}
                  format={DISPLAY_DATE_TIME_FORMAT}
                  placeholder="Chọn ngày giờ gửi"
                  style={{ width: "100%" }}
                  disabledDate={(current) =>
                    current && current.isBefore(dayjs(), "day")
                  }
                />
              </Form.Item>
            )}

            {mode === MODE_NOW && (
              <div className="nt-note">
                <InfoCircleOutlined />
                <span>
                  Thông báo gửi ngay cho khách đang thuê thuộc đối tượng đã
                  chọn. Sau khi gửi không sửa được nội dung.
                </span>
              </div>
            )}

            {mode === MODE_SCHEDULE && (
              <div className="nt-note">
                <InfoCircleOutlined />
                <span>
                  Hệ thống tự gửi khi đến giờ hẹn. Danh sách người nhận được xác
                  định tại thời điểm gửi.
                </span>
              </div>
            )}

            {mode === MODE_DRAFT && (
              <div className="nt-note">
                <InfoCircleOutlined />
                <span>
                  Thông báo được lưu lại, chưa gửi cho ai. Bạn có thể mở lại để
                  sửa hoặc gửi sau.
                </span>
              </div>
            )}
          </Form>
        </Spin>
      </Modal>
    </>
  );
};

export default NotificationFormModal;
