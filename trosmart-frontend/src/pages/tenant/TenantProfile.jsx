import { useState } from "react";
import { Button, Form, Input } from "antd";
import {
  CalendarOutlined,
  HomeOutlined,
  IdcardOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { changeMyPassword, getMyProfile } from "../../api/myTenantApi";
import { useNotify } from "../../components/NotificationProvider";
import { AsyncBlock, PageHead, errorMessage, useLoad } from "./tenantUi";

const GENDER_LABEL = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

const RENTAL_STATUS = {
  RENTING: { label: "Đang thuê", bg: "#e8f7ee", color: "#1b7f45" },
  RENTED: { label: "Đang thuê", bg: "#e8f7ee", color: "#1b7f45" },
  NOT_RENTED: { label: "Chưa thuê phòng", bg: "#f1f3fb", color: "#5b6385" },
  MOVED_OUT: { label: "Đã trả phòng", bg: "#fff4e0", color: "#b26a00" },
};

const show = (value) =>
  value === null || value === undefined || value === "" ? "—" : value;

const formatDate = (value) => {
  const date = dayjs(value);
  return value && date.isValid() ? date.format("DD/MM/YYYY") : "—";
};

// Lấy 1-2 chữ cái đầu của tên để làm ảnh đại diện
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0].toUpperCase())
    .join("") || "?";

/* Một dòng thông tin: icon, nhãn, giá trị */
const Row = ({ icon, label, value }) => (
  <div className="tp-row">
    <span className="tp-row__label">
      {icon}
      {label}
    </span>
    <b className="tp-row__value">{value}</b>
  </div>
);

export default function TenantProfile() {
  const { notify, contextHolder } = useNotify();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useLoad(getMyProfile, []);

  const savePassword = async (values) => {
    setSaving(true);

    try {
      await changeMyPassword(values);
      notify({ type: "success", message: "Đã đổi mật khẩu!" });
      form.resetFields();
    } catch (err) {
      notify({
        type: "error",
        message: "Đổi mật khẩu thất bại!",
        description: errorMessage(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const rental = RENTAL_STATUS[data?.rentalStatus];

  return (
    <div className="tn-page tp-page">
      {contextHolder}

      <PageHead
        title="Tài khoản của tôi"
        desc="Thông tin cá nhân và bảo mật đăng nhập."
      />

      <AsyncBlock loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            {/* THẺ ĐẦU TRANG */}
            <section className="tp-hero">
              <span className="tp-avatar" aria-hidden="true">
                {initials(data.fullName)}
              </span>

              <div className="tp-hero__main">
                <h2 className="tp-hero__name">{show(data.fullName)}</h2>
                <div className="tp-hero__sub">
                  {data.username ? `@${data.username}` : ""}
                  {data.roomNumber
                    ? `${data.username ? " · " : ""}Phòng ${data.roomNumber}`
                    : ""}
                </div>
              </div>

              {rental && (
                <span
                  className="tp-chip"
                  style={{ "--bg": rental.bg, "--c": rental.color }}
                >
                  {rental.label}
                </span>
              )}
            </section>

            <div className="tp-layout">
              {/* THÔNG TIN (CHỈ XEM) */}
              <div className="tp-col">
                <section className="tp-card">
                  <h3 className="tp-card__title">Thông tin cá nhân</h3>

                  <Row
                    icon={<PhoneOutlined />}
                    label="Số điện thoại"
                    value={show(data.phone)}
                  />
                  <Row
                    icon={<MailOutlined />}
                    label="Email"
                    value={show(data.email)}
                  />
                  <Row
                    icon={<CalendarOutlined />}
                    label="Ngày sinh"
                    value={formatDate(data.dateOfBirth)}
                  />
                  <Row
                    icon={<UserOutlined />}
                    label="Giới tính"
                    value={show(GENDER_LABEL[data.gender] ?? data.gender)}
                  />
                  <Row
                    icon={<IdcardOutlined />}
                    label="CCCD / CMND"
                    value={show(data.identityNumber)}
                  />
                  <Row
                    icon={<HomeOutlined />}
                    label="Địa chỉ thường trú"
                    value={show(data.permanentAddress)}
                  />
                  <Row
                    icon={<SafetyCertificateOutlined />}
                    label="Nghề nghiệp"
                    value={show(data.occupation)}
                  />

                  <div className="tp-note">
                    <LockOutlined />
                    <span>
                      Thông tin này do chủ trọ quản lý nên bạn không tự sửa
                      được. Cần thay đổi, vui lòng liên hệ chủ trọ.
                    </span>
                  </div>
                </section>

                <section className="tp-card">
                  <h3 className="tp-card__title">Nơi ở và tài khoản</h3>

                  <Row label="Tên đăng nhập" value={show(data.username)} />
                  <Row label="Phòng" value={show(data.roomNumber)} />
                  <Row label="Tòa nhà" value={show(data.buildingName)} />
                  <Row label="Tham gia từ" value={formatDate(data.createdAt)} />
                </section>
              </div>

              {/* ĐỔI MẬT KHẨU + ĐĂNG XUẤT */}
              <div className="tp-col tp-col--side">
                <section className="tp-card">
                  <h3 className="tp-card__title">Đổi mật khẩu</h3>

                  <Form
                    form={form}
                    layout="vertical"
                    requiredMark={false}
                    onFinish={savePassword}
                    disabled={saving}
                  >
                    <Form.Item
                      name="currentPassword"
                      label="Mật khẩu hiện tại"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập mật khẩu hiện tại",
                        },
                      ]}
                    >
                      <Input.Password
                        size="large"
                        autoComplete="current-password"
                      />
                    </Form.Item>

                    <Form.Item
                      name="newPassword"
                      label="Mật khẩu mới"
                      dependencies={["currentPassword"]}
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập mật khẩu mới",
                        },
                        { min: 6, message: "Mật khẩu tối thiểu 6 ký tự" },
                        ({ getFieldValue }) => ({
                          validator: (_, value) =>
                            !value || getFieldValue("currentPassword") !== value
                              ? Promise.resolve()
                              : Promise.reject(
                                  new Error(
                                    "Mật khẩu mới phải khác mật khẩu hiện tại",
                                  ),
                                ),
                        }),
                      ]}
                    >
                      <Input.Password
                        size="large"
                        autoComplete="new-password"
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label="Nhập lại mật khẩu mới"
                      dependencies={["newPassword"]}
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập lại mật khẩu mới",
                        },
                        ({ getFieldValue }) => ({
                          validator: (_, value) =>
                            !value || getFieldValue("newPassword") === value
                              ? Promise.resolve()
                              : Promise.reject(
                                  new Error("Mật khẩu xác nhận không khớp"),
                                ),
                        }),
                      ]}
                    >
                      <Input.Password
                        size="large"
                        autoComplete="new-password"
                      />
                    </Form.Item>

                    <Button
                      block
                      size="large"
                      type="primary"
                      htmlType="submit"
                      className="tp-btn-primary"
                      icon={<LockOutlined />}
                      loading={saving}
                    >
                      Cập nhật mật khẩu
                    </Button>
                  </Form>
                </section>
              </div>
            </div>
          </>
        )}
      </AsyncBlock>
    </div>
  );
}
