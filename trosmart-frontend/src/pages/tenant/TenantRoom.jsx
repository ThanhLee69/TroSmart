import dayjs from "dayjs";
import { Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { getMyContract, getMyVehicles } from "../../api/myTenantApi";
import {
  AsyncBlock,
  CONTRACT_STATUS,
  PAYMENT_CYCLE_LABEL,
  PageHead,
  VEHICLE_TYPE_LABEL,
  formatDate,
  formatMoney,
  statusMeta,
  useLoad,
} from "./tenantUi";

const EXPIRING_DAYS = 30;

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

// Phần trăm thời gian hợp đồng đã trôi qua
const progressOf = (start, end) => {
  const total = dayjs(end).diff(dayjs(start), "day");
  if (!total || total <= 0) return 0;
  const passed = dayjs().diff(dayjs(start), "day");
  return Math.min(100, Math.max(0, Math.round((passed / total) * 100)));
};

// Tiện nghi có thể là chuỗi hoặc object tùy backend
const amenityName = (item) =>
  typeof item === "string" ? item : (item?.name ?? item?.amenityName ?? "");

// Dòng "nhãn - giá trị"
function Row({ label, value, strong }) {
  return (
    <div className="tr-row">
      <span className="tr-row__label">{label}</span>
      <span className={`tr-row__value${strong ? " is-strong" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Card({ title, children, extra }) {
  return (
    <section className="tr-card">
      <div className="tr-card__head">
        <h2 className="tr-card__title">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export default function TenantRoom() {
  const contract = useLoad(getMyContract, []);
  const vehicles = useLoad(getMyVehicles, []);

  const c = contract.data;
  const percent = c ? progressOf(c.startDate, c.endDate) : 0;
  const daysLeft = c ? dayjs(c.endDate).diff(dayjs(), "day") : 0;
  const expired = c && daysLeft <= 0;
  const expiring = c && !expired && daysLeft <= EXPIRING_DAYS;

  const status = c ? statusMeta(CONTRACT_STATUS, c.status) : null;
  const amenities = (c?.amenities ?? c?.roomAmenities ?? [])
    .map(amenityName)
    .filter(Boolean);
  const services = c?.contractServices ?? [];
  const people = c?.contractTenants ?? [];

  return (
    <div className="tn-page tr-page">
      <PageHead
        title="Phòng của tôi"
        desc="Thông tin phòng, hợp đồng và chi phí hàng tháng."
      />

      <AsyncBlock
        loading={contract.loading}
        error={contract.error}
        onRetry={contract.reload}
        isEmpty={!c}
        emptyText="Bạn chưa có hợp đồng đang hiệu lực"
      >
        {c && (
          <>
            {/* Thẻ đầu trang */}
            <div className="tr-hero">
              <div className="tr-hero__top">
                <small>Hợp đồng {c.contractCode}</small>
                {status && (
                  <span className="tr-hero__chip">{status.label}</span>
                )}
              </div>

              <h1 className="tr-hero__room">Phòng {c.roomNumber}</h1>
              <p className="tr-hero__place">
                {[
                  c.buildingName,
                  c.floor != null ? `Tầng ${c.floor}` : null,
                  c.area != null ? `${c.area} m²` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>

              <div className="tr-hero__price">
                <b>{formatMoney(c.rentPrice)}</b>
                <span>/ tháng</span>
              </div>
            </div>

            <div className="tr-layout">
              <div className="tr-col">
                {/* Hợp đồng */}
                <Card
                  title="Hợp đồng"
                  extra={
                    (expiring || expired) && (
                      <span
                        className={`tr-tag ${
                          expired ? "tr-tag--red" : "tr-tag--orange"
                        }`}
                      >
                        {expired ? "Đã hết hạn" : "Sắp hết hạn"}
                      </span>
                    )
                  }
                >
                  <Row label="Mã hợp đồng" value={c.contractCode} />
                  <Row label="Bắt đầu" value={formatDate(c.startDate)} />
                  <Row label="Kết thúc" value={formatDate(c.endDate)} />
                  <Row label="Tiền cọc" value={formatMoney(c.deposit)} />
                  <Row
                    label="Chốt tiền hàng tháng"
                    value={`Ngày ${c.paymentDueDay}`}
                  />
                  <Row
                    label="Kỳ thanh toán"
                    value={
                      PAYMENT_CYCLE_LABEL[c.paymentCycle] || c.paymentCycle
                    }
                  />

                  <div className="tr-bar">
                    <i
                      className={
                        expired ? "is-red" : expiring ? "is-orange" : ""
                      }
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="tr-bar-note">
                    <span>Đã qua {percent}%</span>
                    <span className={expiring || expired ? "is-warn" : ""}>
                      {daysLeft > 0 ? `Còn ${daysLeft} ngày` : "Đã hết hạn"}
                    </span>
                  </div>
                </Card>

                {/* Chi phí hàng tháng */}
                <Card title="Chi phí hàng tháng">
                  <Row
                    label="Tiền phòng"
                    value={`${formatMoney(c.rentPrice)}/tháng`}
                    strong
                  />

                  {services.map((s, index) => (
                    <Row
                      key={s.id ?? index}
                      label={s.name ?? s.serviceName}
                      value={
                        s.price != null
                          ? `${formatMoney(s.price)}${s.unit ? `/${s.unit}` : ""}`
                          : "—"
                      }
                    />
                  ))}

                  {services.length === 0 && (
                    <div className="tr-empty">Chưa có dịch vụ nào.</div>
                  )}

                  <p className="tr-hint">
                    Điện, nước tính theo chỉ số công tơ thực tế mỗi tháng.
                  </p>
                </Card>
              </div>

              <div className="tr-col">
                {/* Người ở cùng */}
                <Card title="Người ở trong phòng">
                  {people.length === 0 ? (
                    <div className="tr-empty">Chưa có thông tin.</div>
                  ) : (
                    <div className="tr-people">
                      {people.map((t, index) => {
                        const name = t.tenantName ?? t.fullName ?? "—";
                        const primary = t.isPrimary ?? t.primary;

                        return (
                          <div
                            className="tr-person"
                            key={t.id ?? t.tenantId ?? index}
                          >
                            <span className="tr-avatar">
                              {initialsOf(name)}
                            </span>
                            <div>
                              <b>{name}</b>
                              <span>
                                {primary ? "Đứng tên hợp đồng" : "Ở cùng"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Tiện nghi */}
                {amenities.length > 0 && (
                  <Card title="Tiện nghi trong phòng">
                    <div className="tr-chips">
                      {amenities.map((name) => (
                        <span className="tr-chip" key={name}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Xe */}
                <Card title="Xe đã đăng ký">
                  <AsyncBlock
                    loading={vehicles.loading}
                    error={vehicles.error}
                    onRetry={vehicles.reload}
                    isEmpty={(vehicles.data ?? []).length === 0}
                    emptyText="Bạn chưa đăng ký xe nào"
                  >
                    {(vehicles.data ?? []).map((v) => (
                      <Row
                        key={v.id}
                        label={v.licensePlate}
                        value={
                          VEHICLE_TYPE_LABEL[v.vehicleType] || v.vehicleType
                        }
                      />
                    ))}
                  </AsyncBlock>
                </Card>
              </div>
            </div>
          </>
        )}
      </AsyncBlock>
    </div>
  );
}
