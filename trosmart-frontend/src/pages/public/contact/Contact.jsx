import React from "react";
import { Link } from "react-router-dom";
import { Form, Input, Radio, Button } from "antd";
import {
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  SendOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { SiZalo } from "react-icons/si";
import { createContact, getPublicBuildings } from "../../../api/publicApi";
import { useNotify } from "../../../components/NotificationProvider";
import BuildingsMap from "./BuildingsMap";
import "./Contact.css";

const { TextArea } = Input;

/* =========================
   THÔNG TIN LIÊN HỆ
========================= */

const CONTACT = {
  address: "Trường Đại học Giao thông Vận tải",
  phone: "0369 958 572",
  phoneHref: "tel:0369958572",
  zaloHref: "https://zalo.me/0369958572",
  email: "thanhld69@gmail.com",
  hours: "Tất cả các ngày: 08:00 – 20:00",
};

/* =========================
   GOOGLE MAPS (DỰ PHÒNG)
   Chỉ hiện khi chưa có tòa nhà nào lưu tọa độ.
========================= */

const MAP_EMBED_URL =
  "https://www.google.com/maps?q=Tr%C6%B0%E1%BB%9Dng%20%C4%90%E1%BA%A1i%20h%E1%BB%8Dc%20Giao%20th%C3%B4ng%20V%E1%BA%ADn%20t%E1%BA%A3i%2C%20H%C3%A0%20N%E1%BB%99i&output=embed";

/* =========================
   NHU CẦU LIÊN HỆ
========================= */

// value khớp enum ContactTopic ở backend
const TOPICS = [
  { value: "VIEW_ROOM", label: "Xem phòng" },
  { value: "PRICE_INQUIRY", label: "Hỏi giá và thủ tục thuê" },
  { value: "TENANT_SUPPORT", label: "Hỗ trợ khi đang thuê" },
  { value: "OTHER", label: "Khác" },
];

/* =========================
   CÂU HỎI THƯỜNG GẶP
========================= */

const FAQS = [
  {
    q: "Làm thế nào để tìm phòng trọ trên TroSmart?",
    a: "Bạn vào trang Tìm phòng để xem các phòng đang được đăng tin cho thuê. Có thể lọc phòng theo khu vực, mức giá, diện tích và loại phòng để tìm lựa chọn phù hợp. Chọn một phòng để xem hình ảnh, thông tin tiện nghi, giá thuê và thông tin liên hệ của chủ trọ.",
  },
  {
    q: "Tôi có thể xem phòng trước khi quyết định thuê không?",
    a: "Có. Tại trang chi tiết phòng, bạn điền họ tên, số điện thoại hoặc Zalo, kèm lời nhắn nếu có, rồi gửi yêu cầu. Chủ trọ sẽ liên hệ xác nhận lịch xem phòng. Bạn nên trao đổi rõ các điều kiện thuê trước khi quyết định.",
  },
  {
    q: "Giá thuê phòng đã bao gồm điện, nước và dịch vụ chưa?",
    a: "Giá thuê và các khoản phí được hiển thị theo thông tin của từng phòng và dịch vụ áp dụng tại nhà trọ. Tiền điện, nước, vệ sinh, Internet hoặc các dịch vụ khác có thể được tính riêng. Bạn nên kiểm tra chi tiết phòng và xác nhận với chủ trọ trước khi ký hợp đồng.",
  },
  {
    q: "Tiền đặt cọc và thời hạn hợp đồng được quy định thế nào?",
    a: "Tiền đặt cọc, thời hạn thuê, ngày bắt đầu thuê và các điều kiện liên quan được hai bên thỏa thuận trước khi ký hợp đồng. Các nội dung đã thống nhất cần được ghi rõ trong hợp đồng để chủ trọ và người thuê cùng đối chiếu khi cần.",
  },
  {
    q: "Tiền điện và nước hằng tháng được tính như thế nào?",
    a: "Tiền điện và nước được tính dựa trên chỉ số công tơ và đơn giá áp dụng tại nhà trọ. Chi phí được tổng hợp theo kỳ thanh toán và thể hiện trong hóa đơn cùng các khoản phí liên quan để người thuê dễ kiểm tra.",
  },
  {
    q: "Tôi xem hóa đơn tiền phòng ở đâu?",
    a: "Khi được cấp tài khoản người thuê và liên kết với thông tin thuê phòng trên hệ thống, bạn có thể xem các hóa đơn được quản lý cho mình. Hóa đơn thể hiện những khoản cần thanh toán như tiền phòng, điện, nước và dịch vụ phát sinh theo kỳ.",
  },
  {
    q: "Làm thế nào để xác nhận đã thanh toán tiền phòng?",
    a: "Bạn thực hiện thanh toán theo phương thức đã thỏa thuận với chủ trọ. Sau khi nhận được tiền, chủ trọ hoặc nhân viên được phân quyền sẽ cập nhật trạng thái thanh toán trên hệ thống. Nếu thông tin chưa được cập nhật, bạn nên liên hệ chủ trọ và cung cấp thông tin giao dịch để đối chiếu.",
  },
  {
    q: "Tôi cần báo hỏng thiết bị hoặc sự cố trong phòng thì làm thế nào?",
    a: "Nếu đang thuê phòng, bạn gửi yêu cầu sửa chữa trên hệ thống, mô tả tình trạng sự cố và cung cấp hình ảnh nếu chức năng hỗ trợ. Chủ trọ hoặc nhân viên quản lý tiếp nhận, cập nhật trạng thái xử lý để bạn tiện theo dõi. Với sự cố khẩn cấp, bạn nên liên hệ trực tiếp với người quản lý.",
  },
  {
    q: "Tôi cần liên hệ với ai khi có thắc mắc về việc thuê phòng?",
    a: "Bạn có thể sử dụng thông tin điện thoại, Zalo hoặc email tại trang Liên hệ để trao đổi với chủ trọ. Nếu đã được cấp tài khoản sử dụng TroSmart, bạn cũng có thể liên hệ người quản lý nhà trọ để được hỗ trợ về hợp đồng, hóa đơn, thanh toán hoặc yêu cầu sửa chữa.",
  },
  {
    q: "Thông tin cá nhân và hợp đồng thuê phòng được quản lý như thế nào?",
    a: "Thông tin người thuê, hợp đồng và hóa đơn được quản lý trên hệ thống theo tài khoản và quyền truy cập được cấp. Bạn nên giữ bảo mật thông tin đăng nhập và liên hệ người quản lý nếu phát hiện thông tin cá nhân hoặc dữ liệu thuê phòng chưa chính xác.",
  },
];

/* =========================
   TRANG LIÊN HỆ
========================= */

function Contact() {
  const [form] = Form.useForm();
  const { notify, contextHolder } = useNotify();
  const [sent, setSent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState(0);

  /* Thời điểm mở form, gửi lên để server phát hiện bot điền quá nhanh */
  const openedAtRef = React.useRef(Date.now());

  /* Các tòa nhà lấy từ API công khai (có tọa độ để ghim lên bản đồ) */
  const [buildings, setBuildings] = React.useState([]);
  const [buildingsLoading, setBuildingsLoading] = React.useState(true);
  const [activeBuildingId, setActiveBuildingId] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadBuildings = async () => {
      try {
        const data = await getPublicBuildings();

        if (cancelled) return;

        setBuildings(
          (Array.isArray(data) ? data : []).map((building, index) => {
            const lat = Number(building.latitude);
            const lng = Number(building.longitude);

            return {
              id: building.id,
              letter: String.fromCharCode(65 + (index % 26)),
              name: building.name,
              address: [building.address, building.ward, building.province]
                .filter(Boolean)
                .join(", "),
              lat,
              lng,
              hasCoords:
                building.latitude != null &&
                building.longitude != null &&
                Number.isFinite(lat) &&
                Number.isFinite(lng),
            };
          }),
        );
      } catch (error) {
        console.error("Lấy danh sách tòa nhà thất bại:", error);
        if (!cancelled) setBuildings([]);
      } finally {
        if (!cancelled) setBuildingsLoading(false);
      }
    };

    loadBuildings();

    return () => {
      cancelled = true;
    };
  }, []);

  const mappableBuildings = buildings.filter((building) => building.hasCoords);

  /* Thông tin liên hệ */

  const contactItems = [
    {
      key: "address",
      label: "Địa chỉ",
      icon: <EnvironmentOutlined />,
      tone: "blue",
      value: CONTACT.address,
    },
    {
      key: "phone",
      label: "Điện thoại / Zalo",
      icon: <PhoneOutlined />,
      tone: "green",
      value: (
        <>
          <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
          <span className="contact-page__sep"> · </span>
          <a href={CONTACT.zaloHref} target="_blank" rel="noopener noreferrer">
            <SiZalo className="contact-page__inline-icon" /> Zalo
          </a>
        </>
      ),
    },
    {
      key: "email",
      label: "Email",
      icon: <MailOutlined />,
      tone: "purple",
      value: <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>,
    },
    CONTACT.hours && {
      key: "hours",
      label: "Giờ tiếp khách",
      icon: <ClockCircleOutlined />,
      tone: "orange",
      value: CONTACT.hours,
    },
  ].filter(Boolean);

  /* Xử lý gửi form */

  const handleFinish = async (values) => {
    setSubmitting(true);

    try {
      await createContact({
        fullName: values.fullName?.trim(),
        phone: values.phone?.replace(/\s/g, ""),
        email: values.email?.trim() || undefined,
        topic: values.topic,
        message: values.message?.trim(),
        // Ô ẩn chống bot: người thật luôn để trống
        website: values.website || "",
        elapsedMs: Date.now() - openedAtRef.current,
      });
      setSent(true);
    } catch (error) {
      // Ưu tiên hiện thông báo của server (quá nhiều lần, trùng nội dung...)
      notify({
        type: "error",
        message: "Gửi liên hệ thất bại",
        description:
          error?.response?.data?.message ||
          "Chưa gửi được liên hệ. Vui lòng thử lại hoặc gọi trực tiếp cho chủ trọ.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* Gửi yêu cầu mới */

  const handleSendAgain = () => {
    form.resetFields();
    openedAtRef.current = Date.now();
    setSent(false);
  };

  return (
    <main className="contact-page">
      {contextHolder}

      {/* TIÊU ĐỀ */}

      <section className="contact-page__section contact-page__intro">
        <nav aria-label="Đường dẫn" className="contact-page__breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <span className="contact-page__breadcrumb-current">Liên hệ</span>
        </nav>

        <h1 className="contact-page__title">Liên hệ với chúng tôi</h1>

        <p className="contact-page__lead">
          Muốn xem phòng, hỏi giá hoặc cần hỗ trợ khi đang thuê? Để lại thông
          tin hoặc gọi trực tiếp, chủ trọ sẽ phản hồi sớm.
        </p>
      </section>

      {/* THÔNG TIN LIÊN HỆ VÀ FORM */}

      <section className="contact-page__section contact-page__main">
        {/* Cột trái: thông tin và lối gọi nhanh */}

        <div className="contact-page__side">
          <div className="contact-page__info-card">
            <h2 className="contact-page__card-title">Thông tin liên hệ</h2>

            <div className="contact-page__info-list">
              {contactItems.map((item) => (
                <div
                  key={item.key}
                  className={`contact-page__info-item contact-page__info-item--${item.tone}`}
                >
                  <span className="contact-page__info-icon">{item.icon}</span>

                  <div className="contact-page__info-body">
                    <span className="contact-page__info-label">
                      {item.label}
                    </span>

                    <span className="contact-page__info-value">
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/tim-phong" className="contact-page__info-link">
              <span>Đang tìm phòng? Xem danh sách phòng trống</span>
              <ArrowRightOutlined />
            </Link>
          </div>

          <div className="contact-page__cta">
            <div className="contact-page__cta-text">
              <strong>Cần trao đổi gấp?</strong>
              <span>Gọi hoặc nhắn Zalo để được trả lời nhanh nhất.</span>
            </div>

            <div className="contact-page__cta-actions">
              <a
                href={CONTACT.phoneHref}
                className="contact-page__cta-btn contact-page__cta-btn--light"
              >
                <PhoneOutlined /> Gọi ngay
              </a>

              <a
                href={CONTACT.zaloHref}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-page__cta-btn contact-page__cta-btn--ghost"
              >
                <SiZalo /> Zalo
              </a>
            </div>
          </div>
        </div>

        {/* FORM LIÊN HỆ */}

        <div className="contact-page__form-card" id="gui-yeu-cau">
          {!sent ? (
            <>
              <h2 className="contact-page__card-title ">
                Gửi yêu cầu cho chúng tôi
              </h2>

              <p className="contact-page__form-description">
                Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại sớm nhất.
              </p>

              <Form
                form={form}
                layout="vertical"
                size="large"
                requiredMark={false}
                initialValues={{ topic: TOPICS[0].value }}
                onFinish={handleFinish}
              >
                {/* NHU CẦU: chọn nhanh bằng nút bo tròn */}

                <Form.Item label="Bạn cần gì?" name="topic">
                  <Radio.Group
                    options={TOPICS}
                    optionType="button"
                    className="contact-page__topics"
                  />
                </Form.Item>

                {/* HỌ TÊN VÀ SỐ ĐIỆN THOẠI */}

                <div className="contact-page__row">
                  <Form.Item
                    label="Họ và tên"
                    name="fullName"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập họ và tên",
                      },
                    ]}
                  >
                    <Input
                      placeholder="Nguyễn Văn A"
                      autoComplete="name"
                      maxLength={100}
                    />
                  </Form.Item>

                  <Form.Item
                    label="Số điện thoại"
                    name="phone"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập số điện thoại",
                      },
                      {
                        pattern: /^(0|\+84)(\s?\d){9}$/,
                        message: "Số điện thoại chưa đúng",
                      },
                    ]}
                  >
                    <Input
                      placeholder="09xx xxx xxx"
                      maxLength={15}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </Form.Item>
                </div>

                {/* EMAIL */}

                <Form.Item
                  label="Email (không bắt buộc)"
                  name="email"
                  rules={[
                    {
                      type: "email",
                      message: "Email chưa đúng định dạng",
                    },
                  ]}
                >
                  <Input
                    placeholder="email@example.com"
                    maxLength={150}
                    autoComplete="email"
                    inputMode="email"
                  />
                </Form.Item>

                {/* NỘI DUNG */}

                <Form.Item
                  label="Nội dung"
                  name="message"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập nội dung",
                    },
                    {
                      min: 10,
                      message: "Nội dung tối thiểu 10 ký tự",
                    },
                  ]}
                >
                  <TextArea
                    rows={4}
                    maxLength={1000}
                    showCount
                    placeholder="Hãy cho chúng tôi biết nhu cầu hoặc vấn đề bạn cần hỗ trợ..."
                  />
                </Form.Item>

                {/* Ô ẩn chống bot (honeypot), CSS đẩy ra ngoài màn hình */}

                <div className="contact-page__hp" aria-hidden="true">
                  <Form.Item label="Website" name="website">
                    <Input tabIndex={-1} autoComplete="off" />
                  </Form.Item>
                </div>

                {/* NÚT GỬI */}

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  className="contact-page__submit"
                  icon={<SendOutlined />}
                >
                  Gửi yêu cầu
                </Button>
              </Form>
            </>
          ) : (
            /* THÔNG BÁO THÀNH CÔNG */

            <div className="contact-page__success" role="status">
              <span className="contact-page__success-icon">
                <CheckOutlined />
              </span>

              <h2 className="contact-page__card-title">
                Đã ghi nhận yêu cầu của bạn
              </h2>

              <p>
                TroSmart sẽ liên hệ lại qua số điện thoại hoặc email bạn đã cung
                cấp.
              </p>

              <Button size="large" onClick={handleSendAgain}>
                Gửi yêu cầu khác
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* VỊ TRÍ CÁC TÒA NHÀ */}

      <section className="contact-page__section contact-page__block">
        <h2 className="contact-page__section-title">Vị trí các tòa nhà</h2>

        <p className="contact-page__section-lead">
          Chọn một tòa nhà trong danh sách để xem vị trí trên bản đồ và chỉ
          đường đến nơi.
        </p>

        <div className="contact-page__map-grid">
          {/* BẢN ĐỒ CÁC TÒA NHÀ */}

          <div className="contact-page__map-card">
            <div className="contact-page__map-frame">
              {mappableBuildings.length > 0 ? (
                <BuildingsMap
                  buildings={mappableBuildings}
                  activeId={activeBuildingId}
                  onSelect={setActiveBuildingId}
                  className="contact-page__map-embed"
                />
              ) : (
                <iframe
                  title="Bản đồ vị trí các tòa nhà"
                  src={MAP_EMBED_URL}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="contact-page__map-embed"
                  allowFullScreen
                />
              )}
            </div>
          </div>

          {/* DANH SÁCH TÒA NHÀ */}

          <div className="contact-page__building-panel">
            <div className="contact-page__building-head">
              <span>Danh sách tòa nhà</span>
              {!buildingsLoading && (
                <span className="contact-page__building-count">
                  {buildings.length}
                </span>
              )}
            </div>

            <div className="contact-page__building-list">
              {buildingsLoading && (
                <div className="contact-page__building">
                  <div className="contact-page__building-body">
                    <span>Đang tải danh sách tòa nhà...</span>
                  </div>
                </div>
              )}

              {!buildingsLoading && buildings.length === 0 && (
                <div className="contact-page__building">
                  <div className="contact-page__building-body">
                    <span>Chưa có thông tin tòa nhà.</span>
                  </div>
                </div>
              )}

              {buildings.map((building) => (
                <div
                  key={building.id}
                  className={`contact-page__building${
                    building.id === activeBuildingId
                      ? " contact-page__building--active"
                      : ""
                  }`}
                  role={building.hasCoords ? "button" : undefined}
                  tabIndex={building.hasCoords ? 0 : undefined}
                  onClick={() =>
                    building.hasCoords && setActiveBuildingId(building.id)
                  }
                  onKeyDown={(event) => {
                    if (
                      building.hasCoords &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      setActiveBuildingId(building.id);
                    }
                  }}
                >
                  <span className="contact-page__building-letter">
                    {building.letter}
                  </span>

                  <div className="contact-page__building-body">
                    <h3>{building.name}</h3>

                    <span>{building.address || "Địa chỉ đang cập nhật"}</span>

                    <div className="contact-page__building-links">
                      <Link
                        to="/tim-phong"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Xem phòng trống
                      </Link>

                      {building.hasCoords && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${building.lat},${building.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Chỉ đường
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CÂU HỎI THƯỜNG GẶP: tiêu đề bên trái, danh sách bên phải */}

      <section className="contact-page__section contact-page__block">
        <div className="contact-page__faq-section">
          <div className="contact-page__faq-header">
            <h2 className="contact-page__section-title">Câu hỏi thường gặp</h2>

            <p className="contact-page__section-lead">
              Những điều người thuê hay hỏi nhất. Chưa thấy câu trả lời bạn cần?
              Hãy gửi tin nhắn cho chúng tôi.
            </p>

            <a href="#gui-yeu-cau" className="contact-page__faq-link">
              Gửi tin nhắn <ArrowRightOutlined />
            </a>
          </div>

          <div className="contact-page__faq">
            {FAQS.map((item, index) => {
              const open = openFaq === index;

              return (
                <div key={item.q} className="contact-page__faq-item">
                  <button
                    type="button"
                    className="contact-page__faq-q"
                    aria-expanded={open}
                    aria-controls={`faq-answer-${index}`}
                    onClick={() => setOpenFaq(open ? -1 : index)}
                  >
                    <span>{item.q}</span>
                  </button>

                  {open && (
                    <p
                      id={`faq-answer-${index}`}
                      className="contact-page__faq-a"
                    >
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Contact;
