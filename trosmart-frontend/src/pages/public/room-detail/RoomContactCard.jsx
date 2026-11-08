import { useRef, useState } from "react";
import { Card, Typography, Form, Input, Button, Divider } from "antd";
import { SendOutlined, MessageOutlined } from "@ant-design/icons";
import { createContact } from "../../../api/publicApi";
import { useNotify } from "../../../components/NotificationProvider";
import "./RoomContactCard.css";

const { Title, Text } = Typography;

// Cùng số Zalo với trang Liên hệ
const ZALO_HREF = "https://zalo.me/0369958572";

const formatPrice = (value) =>
  value == null ? null : `${new Intl.NumberFormat("vi-VN").format(value)}đ`;

export default function RoomContactCard({ room }) {
  const [form] = Form.useForm();
  const { notify, contextHolder } = useNotify();
  const [submitting, setSubmitting] = useState(false);

  // Thời điểm mở form, gửi lên để server phát hiện bot điền quá nhanh
  const openedAtRef = useRef(Date.now());

  const price = formatPrice(room?.rentalPrice);

  const handleSubmit = async (values) => {
    if (!room?.id) return;

    setSubmitting(true);

    try {
      const note = values.note?.trim();

      // API bắt buộc có nội dung (từ 10 ký tự) nên luôn có câu mở đầu tự ghép,
      // lời nhắn của khách (nếu có) được nối thêm phía sau
      const message = [
        `Xin đặt lịch xem phòng ${room.roomNumber}${
          room.buildingName ? ` (${room.buildingName})` : ""
        }.`,
        note && `Lời nhắn: ${note}`,
      ]
        .filter(Boolean)
        .join("\n");

      await createContact({
        fullName: values.fullName.trim(),
        phone: values.phone.replace(/\s/g, ""),
        email: values.email?.trim() || undefined,
        // Hai trường này không hiện trên form: luôn là xem phòng, gắn với phòng đang mở
        topic: "VIEW_ROOM",
        roomId: room.id,
        message,
        // Ô ẩn chống bot: người thật luôn để trống
        website: values.website || "",
        elapsedMs: Date.now() - openedAtRef.current,
      });

      notify({
        type: "success",
        message: "Đã gửi yêu cầu xem phòng",
        description: "Chủ trọ sẽ liên hệ để xác nhận ngày giờ.",
      });

      form.resetFields();
      openedAtRef.current = Date.now();
    } catch (error) {
      // Ưu tiên hiện thông báo của server (quá nhiều lần, trùng nội dung...)
      notify({
        type: "error",
        message: "Gửi yêu cầu thất bại",
        description:
          error?.response?.data?.message ||
          "Vui lòng thử lại hoặc nhắn Zalo cho chủ trọ.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="room-contact-card" bordered={false}>
      {contextHolder}

      {/* Giá thuê */}
      <div className="room-contact-card__price">
        <Title level={3} className="room-contact-card__price-value">
          {price ?? "Liên hệ"}
        </Title>

        {price && (
          <Text className="room-contact-card__price-unit">/ tháng</Text>
        )}
      </div>

      <Divider className="room-contact-card__divider" />

      {/* Form đặt lịch */}
      <Title level={4} className="room-contact-card__title">
        Đặt lịch xem phòng
      </Title>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
        className="room-contact-card__form"
      >
        <Form.Item
          label="Họ và tên"
          name="fullName"
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Vui lòng nhập họ và tên",
            },
          ]}
        >
          <Input
            placeholder="Nguyễn Văn A"
            size="large"
            maxLength={100}
            autoComplete="name"
          />
        </Form.Item>

        <Form.Item
          label="Số điện thoại hoặc Zalo"
          name="phone"
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Vui lòng nhập số điện thoại hoặc Zalo",
            },
            {
              pattern: /^(0|\+84)(\s?\d){9}$/,
              message: "Số điện thoại chưa đúng",
            },
          ]}
        >
          <Input
            placeholder="09xx xxx xxx"
            size="large"
            maxLength={15}
            autoComplete="tel"
            inputMode="tel"
          />
        </Form.Item>

        <Form.Item
          label="Email (không bắt buộc)"
          name="email"
          rules={[{ type: "email", message: "Email chưa đúng định dạng" }]}
        >
          <Input
            placeholder="email@example.com"
            size="large"
            maxLength={150}
            autoComplete="email"
            inputMode="email"
          />
        </Form.Item>

        <Form.Item label="Lời nhắn (không bắt buộc)" name="note">
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            placeholder="Ví dụ: Tôi muốn xem phòng vào chiều thứ 7, sau 17h."
          />
        </Form.Item>

        {/* Ô ẩn chống bot (honeypot), CSS đẩy ra ngoài màn hình */}
        <div className="room-contact-card__hp" aria-hidden="true">
          <Form.Item label="Website" name="website">
            <Input tabIndex={-1} autoComplete="off" />
          </Form.Item>
        </div>

        <Form.Item className="room-contact-card__submit">
          <Button
            type="primary"
            htmlType="submit"
            icon={<SendOutlined />}
            loading={submitting}
            block
          >
            Gửi yêu cầu xem phòng
          </Button>
        </Form.Item>
      </Form>

      <Button
        className="room-contact-card__zalo"
        icon={<MessageOutlined />}
        href={ZALO_HREF}
        target="_blank"
        rel="noopener noreferrer"
        block
      >
        Nhắn Zalo cho chủ trọ
      </Button>

      <div className="room-contact-card__note">
        Chủ trọ sẽ liên hệ để xác nhận ngày giờ.
        <br />
        Xem phòng không mất phí.
      </div>
    </Card>
  );
}
