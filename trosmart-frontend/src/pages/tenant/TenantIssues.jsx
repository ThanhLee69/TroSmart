import { useState } from "react";
import { Button, Form, Input, Popconfirm, Segmented, Select } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  cancelMyIssue,
  createMyIssue,
  getMyIssues,
} from "../../api/myTenantApi";
import { useNotify } from "../../components/NotificationProvider";
import {
  AsyncBlock,
  ISSUE_CATEGORY_LABEL,
  PageHead,
  errorMessage,
  useLoad,
} from "./tenantUi";

const { TextArea } = Input;

/* Bộ lọc: mỗi mục gom các trạng thái của backend */
const FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "WAITING", label: "Chờ tiếp nhận" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "DONE", label: "Đã xong" },
];

const FILTER_STATUSES = {
  WAITING: ["PENDING"],
  PROCESSING: ["ACCEPTED", "IN_PROGRESS"],
  DONE: ["COMPLETED"],
};

/* Trạng thái (khớp enum IssueStatus) */
const STATUS_META = {
  PENDING: { label: "Chờ tiếp nhận", bg: "#f1f3fb", color: "#5b6385" },
  ACCEPTED: { label: "Đã tiếp nhận", bg: "#eaf2ff", color: "#1677ff" },
  IN_PROGRESS: { label: "Đang xử lý", bg: "#fff4e0", color: "#b26a00" },
  COMPLETED: { label: "Hoàn tất", bg: "#e8f7ee", color: "#1b7f45" },
  CANCELLED: { label: "Đã hủy", bg: "#fff1f0", color: "#cf1322" },
};

/* Mức độ ưu tiên (khớp enum IssuePriority) */
const PRIORITY_META = {
  LOW: { label: "Thấp", hint: "Chưa cần xử lý ngay", color: "#8c8c8c" },
  MEDIUM: {
    label: "Trung bình",
    hint: "Xử lý theo kế hoạch",
    color: "#2976e1",
  },
  HIGH: { label: "Cao", hint: "Cần ưu tiên sớm", color: "#fa8c16" },
  URGENT: { label: "Khẩn cấp", hint: "Cần xử lý ngay", color: "#f5222d" },
};

const CATEGORY_OPTIONS = Object.entries(ISSUE_CATEGORY_LABEL).map(
  ([value, label]) => ({ value, label }),
);

/* Chấm màu + chữ, nền nhạt theo màu */
const Chip = ({ label, bg, color }) => (
  <span className="ti-chip" style={{ "--c": color, "--bg": bg }}>
    {label}
  </span>
);

/* 4 ô chọn mức độ, dùng được trong Form.Item */
const PriorityPick = ({ value, onChange }) => (
  <div className="ti-pick" role="radiogroup" aria-label="Mức độ ưu tiên">
    {Object.entries(PRIORITY_META).map(([key, meta]) => (
      <button
        key={key}
        type="button"
        role="radio"
        aria-checked={value === key}
        className={value === key ? "is-on" : ""}
        style={{ "--c": meta.color }}
        onClick={() => onChange?.(key)}
      >
        <span>
          <i /> {meta.label}
        </span>
        <small>{meta.hint}</small>
      </button>
    ))}
  </div>
);

export default function TenantIssues() {
  const { notify, contextHolder } = useNotify();
  const [form] = Form.useForm();

  const [filter, setFilter] = useState("ALL");
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error, reload } = useLoad(
    () => getMyIssues({ page: 1, size: 50 }),
    [],
  );

  const issues = data?.items ?? [];
  const visible = issues.filter(
    (i) => filter === "ALL" || FILTER_STATUSES[filter].includes(i.status),
  );

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category || "OTHER",
      priority: values.priority || "MEDIUM",
      note: values.note?.trim() || null,
    };

    setSubmitting(true);

    try {
      await createMyIssue(payload);
      notify({ type: "success", message: "Đã gửi yêu cầu sửa chữa!" });
      form.resetFields();
      reload();
    } catch (err) {
      notify({
        type: "error",
        message: "Gửi yêu cầu thất bại!",
        description: errorMessage(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelMyIssue(id);
      notify({ type: "success", message: "Đã hủy yêu cầu" });
      reload();
    } catch (err) {
      notify({
        type: "error",
        message: "Không thể hủy yêu cầu",
        description: errorMessage(err),
      });
    }
  };

  return (
    <div className="tn-page ti-page">
      {contextHolder}

      <PageHead
        title="Yêu cầu sửa chữa"
        desc="Gửi và theo dõi các yêu cầu sửa chữa trong phòng của bạn."
      />

      <div className="ti-layout">
        {/* DANH SÁCH */}
        <div className="ti-col">
          <Segmented
            block
            className="ti-seg"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
          />

          <AsyncBlock
            loading={loading}
            error={error}
            onRetry={reload}
            isEmpty={visible.length === 0}
            emptyText="Chưa có yêu cầu nào"
          >
            {/* Mỗi yêu cầu là một thẻ riêng */}
            <section className="ti-list">
              {visible.map((issue) => {
                const status = STATUS_META[issue.status] || STATUS_META.PENDING;
                const priority = PRIORITY_META[issue.priority];

                return (
                  <article
                    className="ti-item"
                    key={issue.id}
                    style={{ "--st": status.color }}
                  >
                    <div className="ti-item__main">
                      <div>
                        <h3 className="ti-item__title">{issue.title}</h3>
                        <div className="ti-item__meta">
                          {ISSUE_CATEGORY_LABEL[issue.category] || "Khác"} · gửi{" "}
                          {dayjs(issue.createdAt).format("DD/MM/YYYY")}
                        </div>
                      </div>

                      {priority && (
                        <span
                          className="ti-chip ti-chip--dot"
                          style={{
                            "--c": priority.color,
                            "--bg": `color-mix(in srgb, ${priority.color} 12%, #fff)`,
                          }}
                        >
                          {priority.label}
                        </span>
                      )}

                      <p className="ti-item__desc">{issue.description}</p>

                      {issue.resolution && (
                        <div className="ti-reply">
                          <b>Phản hồi từ chủ trọ</b>
                          {issue.resolution}
                        </div>
                      )}
                    </div>

                    {/* Bên phải: trạng thái và nút hủy nhỏ */}
                    <div className="ti-item__side">
                      <Chip {...status} />

                      {issue.status === "PENDING" && (
                        <Popconfirm
                          title="Hủy yêu cầu này?"
                          okText="Hủy yêu cầu"
                          okButtonProps={{ danger: true }}
                          cancelText="Không"
                          placement="topRight"
                          onConfirm={() => handleCancel(issue.id)}
                        >
                          <button type="button" className="ti-cancel">
                            <CloseOutlined /> Hủy
                          </button>
                        </Popconfirm>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </AsyncBlock>
        </div>

        {/* FORM GỬI YÊU CẦU MỚI */}
        <section className="ti-card ti-form">
          <h2 className="ti-form__title">Gửi yêu cầu mới</h2>

          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            disabled={submitting}
            initialValues={{ category: "OTHER", priority: "MEDIUM" }}
          >
            <Form.Item name="category" label="Loại sự cố">
              <Select size="large" options={CATEGORY_OPTIONS} />
            </Form.Item>

            <Form.Item
              name="title"
              label="Tiêu đề"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Vui lòng nhập tiêu đề",
                },
                { max: 150, message: "Tối đa 150 ký tự" },
              ]}
            >
              <Input
                size="large"
                placeholder="VD: Vòi nước bị rò"
                maxLength={150}
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Mô tả chi tiết"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Vui lòng mô tả sự cố",
                },
                { max: 3000, message: "Tối đa 3000 ký tự" },
              ]}
            >
              <TextArea
                rows={4}
                maxLength={3000}
                placeholder="Mô tả vấn đề, thời điểm xảy ra..."
              />
            </Form.Item>

            <Form.Item name="priority" label="Mức độ ưu tiên">
              <PriorityPick />
            </Form.Item>

            <Form.Item
              name="note"
              label="Ghi chú thời gian có thể đến sửa"
              extra="Cho chủ trọ biết thời gian bạn tiện để thợ vào phòng (không bắt buộc)."
            >
              <TextArea
                rows={3}
                maxLength={500}
                placeholder="VD: Em muốn thợ đến sửa vào buổi sáng, sau 8h..."
              />
            </Form.Item>

            <Button
              block
              size="large"
              type="primary"
              className="ti-btn-primary"
              icon={<CheckOutlined />}
              loading={submitting}
              onClick={handleSubmit}
            >
              Gửi yêu cầu
            </Button>
          </Form>
        </section>
      </div>
    </div>
  );
}
