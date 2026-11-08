import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button, Pagination, Spin } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleFilled,
  EditOutlined,
  InfoCircleFilled,
  ExperimentOutlined,
  FileDoneOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getMeterReadingById,
  getMeterReadingHistory,
} from "../../../api/meterReadingApi";
import { path_name } from "../../../constants/path_name";
import { useNotify } from "../../../components/NotificationProvider";
import CommonSelect from "../../../components/CommonSelect";
import MeterReadingForm from "./MeterReadingForm";
import "./MeterReadingDetail.css";

// =========================
// ROUTES
// Trang này chạy ở: `${path_name.meter}/phong/:roomId?month=10&year=2026`
// state.record (từ bảng danh sách) chỉ dùng cho phòng CHƯA có bản ghi,
// để vẫn hiện tên phòng, tòa nhà và chỉ số đầu kỳ
// =========================
const ROUTES = {
  list: path_name.meter,
  invoice: (invoiceId) => `${path_name.invoice}/${invoiceId}`,
};

// =========================
// CONSTANTS
// =========================
const STATUS_MAP = {
  NOT_RECORDED: { label: "Chưa ghi", tone: "none" },
  RECORDED: { label: "Đã ghi", tone: "recorded" },
  INVOICED: { label: "Đã lập hóa đơn", tone: "invoiced" },
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: `Tháng ${index + 1}`,
}));

const CURRENT_YEAR = dayjs().year();

// Từ 3 năm trước đến năm sau
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => {
  const year = CURRENT_YEAR - 3 + index;
  return { value: year, label: `Năm ${year}` };
});

const HISTORY_PAGE_SIZE = 6;

// =========================
// HELPERS
// =========================
const formatNumber = (value) => {
  if (value === null || value === undefined) return "—";

  const number = Number(value);
  if (Number.isNaN(number)) return "—";

  return number.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
};

// Tiền / đơn giá: 375,500 (dấu phẩy ngăn cách hàng nghìn)
const formatMoney = (value) => {
  if (value === null || value === undefined) return "—";

  const number = Number(value);
  if (Number.isNaN(number)) return "—";

  return Math.round(number).toLocaleString("en-US");
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("vi-VN");
};

// "1.245 → 1.318 (73)"; chưa có chỉ số cuối thì "1.245 → —"
const formatRange = (start, end, consumption) => {
  if (end === null || end === undefined) return `${formatNumber(start)} → —`;
  return `${formatNumber(start)} → ${formatNumber(end)} (${formatNumber(consumption)})`;
};

// Giống hệt trạng thái ở bảng danh sách (class mtr-status)
const StatusChip = ({ status, large }) => {
  const key = STATUS_MAP[status] ? status : "NOT_RECORDED";

  return (
    <span
      className={`mtr-status mtr-status--${key}${large ? " mtr-status--lg" : ""}`}
    >
      <span className="mtr-status__dot" />
      {STATUS_MAP[key].label}
    </span>
  );
};

// =========================
// SUB COMPONENTS
// =========================
const MeterCard = ({
  kind,
  title,
  unit,
  icon,
  start,
  end,
  consumption,
  price,
}) => {
  const hasEnd = end !== null && end !== undefined;
  const hasPrice = price !== null && price !== undefined;

  const totalAmount =
    hasEnd && hasPrice ? Number(consumption || 0) * Number(price) : null;

  return (
    <div className={`md-meter md-meter--${kind}`}>
      <div className="md-meter__head">
        <div className="md-meter__heading">
          {icon}
          <b>{title}</b>
        </div>

        <span className="md-meter__price">
          {hasPrice ? `${formatMoney(price)} đ/${unit}` : "Chưa có đơn giá"}
        </span>
      </div>

      <div className="md-meter__values">
        <div className="md-meter__col">
          <span className="md-lbl">Chỉ số cũ</span>
          <b className="md-big">{formatNumber(start)}</b>
        </div>

        <span className="md-meter__arrow" aria-hidden="true">
          →
        </span>

        <div className="md-meter__col">
          <span className="md-lbl">Chỉ số mới</span>
          {hasEnd ? (
            <b className="md-big">{formatNumber(end)}</b>
          ) : (
            <b className="md-big md-big--empty">Chưa nhập</b>
          )}
        </div>
      </div>

      <div className="md-meter__foot">
        <span>
          Tiêu thụ <b>{hasEnd ? formatNumber(consumption) : "—"}</b> {unit}
        </span>

        <div className="md-meter__amount">
          <b>{totalAmount !== null ? `${formatMoney(totalAmount)} đ` : "—"}</b>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, children }) => (
  <div className="md-row">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

const PhotoSlot = ({ kind, label, url, date }) => (
  <div className="md-photo">
    {url ? (
      <img className="md-photo__img" src={url} alt={label} />
    ) : (
      <div className={`md-photo__empty md-photo__empty--${kind}`}>
        {kind === "elec" ? <ThunderboltOutlined /> : <ExperimentOutlined />}
        <span>{label}</span>
      </div>
    )}
    <span className="md-lbl">Chụp ngày {date}</span>
  </div>
);

// =========================
// PAGE
// =========================
const MeterReadingDetail = () => {
  const { notify, contextHolder } = useNotify();
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();

  // Kỳ đang xem (mặc định là tháng hiện tại)
  const month = Number(searchParams.get("month")) || dayjs().month() + 1;
  const year = Number(searchParams.get("year")) || dayjs().year();

  // Dòng của bảng danh sách (chỉ có khi mở từ danh sách)
  const stateRecord =
    location.state?.record &&
    String(location.state.record.roomId) === String(roomId)
      ? location.state.record
      : null;

  // =========================
  // DATA
  // =========================
  const [detail, setDetail] = useState(null); // bản ghi của kỳ đang xem (null = chưa ghi)
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);

  // Lịch sử + bộ lọc tháng / năm
  const [historyFilter, setHistoryFilter] = useState({
    billingMonth: undefined,
    billingYear: undefined,
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [history, setHistory] = useState({ items: [], totalItems: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  // =========================
  // LOAD BẢN GHI CỦA KỲ ĐANG XEM
  // Dùng API lịch sử lọc đúng tháng + năm để tìm id, rồi lấy chi tiết đầy đủ
  // =========================
  const fetchDetail = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getMeterReadingHistory(roomId, {
        billingMonth: month,
        billingYear: year,
        page: 1,
        size: 1,
      });

      const found = data?.items?.[0];
      setDetail(found?.id ? await getMeterReadingById(found.id) : null);
    } catch (error) {
      setDetail(null);

      notifyRef.current({
        type: "error",
        message: "Không thể tải chi tiết điện nước",
        description:
          error?.response?.data?.message ||
          "Vui lòng kiểm tra kết nối đến máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }, [roomId, month, year]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // =========================
  // LOAD LỊCH SỬ
  // =========================
  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setHistoryLoading(true);

      try {
        const data = await getMeterReadingHistory(roomId, {
          billingMonth: historyFilter.billingMonth,
          billingYear: historyFilter.billingYear,
          page: historyPage,
          size: HISTORY_PAGE_SIZE,
        });

        if (cancelled) return;

        setHistory({
          items: data?.items ?? [],
          totalItems: data?.totalItems ?? 0,
        });
      } catch (error) {
        if (cancelled) return;

        setHistory({ items: [], totalItems: 0 });

        notifyRef.current({
          type: "error",
          message: "Không thể tải lịch sử ghi chỉ số",
          description:
            error?.response?.data?.message || "Vui lòng thử lại sau.",
        });
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [roomId, historyFilter, historyPage, historyRefresh]);

  // =========================
  // HANDLERS
  // =========================
  const updateHistoryFilter = (key, value) => {
    setHistoryFilter((prev) => ({ ...prev, [key]: value ?? undefined }));
    setHistoryPage(1);
  };

  const clearHistoryFilter = () => {
    setHistoryFilter({ billingMonth: undefined, billingYear: undefined });
    setHistoryPage(1);
  };

  // Sau khi ghi / sửa chỉ số xong: tải lại chi tiết và lịch sử
  const refreshData = async () => {
    await fetchDetail();
    setHistoryRefresh((value) => value + 1);
  };

  const goBack = () => {
    // Có lịch sử trình duyệt thì quay lại, không thì về danh sách
    if (window.history.length > 1) navigate(-1);
    else navigate(ROUTES.list);
  };

  // =========================
  // DỮ LIỆU HIỂN THỊ
  // Phòng chưa có bản ghi thì lấy tạm từ dòng danh sách (nếu có)
  // =========================
  const samePeriodRecord =
    stateRecord &&
    stateRecord.billingMonth === month &&
    stateRecord.billingYear === year
      ? stateRecord
      : null;

  const reading = detail ?? samePeriodRecord;
  const roomInfo = detail ?? stateRecord;

  const status = detail?.status ?? "NOT_RECORDED";
  const isNotRecorded = !detail?.id;
  const isInvoiced = status === "INVOICED";

  const roomNumber = roomInfo?.roomNumber || `#${roomId}`;
  const buildingName = roomInfo?.buildingName;
  const tenantName = roomInfo?.tenantName;
  const contractCode = roomInfo?.contractCode;

  const hasPhotos = Boolean(
    detail?.electricityImageUrl || detail?.waterImageUrl,
  );

  // Record truyền vào form ghi / sửa chỉ số
  const formRecord = detail?.id
    ? detail
    : {
        roomId: Number(roomId),
        billingMonth: month,
        billingYear: year,
        roomNumber: roomInfo?.roomNumber,
        buildingName,
        tenantName,
        contractCode,
        electricityStart: reading?.electricityStart,
        waterStart: reading?.waterStart,
      };

  const banner = isInvoiced
    ? {
        tone: "success",
        title: "Kỳ này đã lập hóa đơn",
        text: "Chỉ số bị khóa, không thể sửa. Muốn chỉnh phải hủy hóa đơn trước.",
      }
    : isNotRecorded
      ? {
          tone: "warning",
          title: `Chưa có chỉ số kỳ ${month}/${year}`,
          text: "Nhập chỉ số mới của điện và nước để hoàn tất kỳ này và lập hóa đơn.",
        }
      : null;

  // Link sang kỳ khác khi bấm vào dòng lịch sử
  const periodLink = (m, y) => ({
    pathname: location.pathname,
    search: `?month=${m}&year=${y}`,
  });

  const from =
    history.totalItems === 0 ? 0 : (historyPage - 1) * HISTORY_PAGE_SIZE + 1;
  const to = Math.min(historyPage * HISTORY_PAGE_SIZE, history.totalItems);

  // =========================
  // RENDER
  // =========================
  return (
    <Fragment>
      {contextHolder}

      <Spin spinning={loading}>
        <div className="md-page">
          {/* HEADER */}
          <header className="md-head">
            <div className="md-head__left">
              <Button
                className="md-back"
                icon={<ArrowLeftOutlined />}
                onClick={goBack}
                aria-label="Quay lại danh sách điện nước"
              />

              <div className="md-head__text">
                <div className="md-head__title">
                  <h1>
                    Phòng {roomNumber} · Kỳ {month}/{year}
                  </h1>
                  <StatusChip status={status} large />
                </div>

                <span className="md-head__sub">
                  {[buildingName, tenantName].filter(Boolean).join(" · ") ||
                    "—"}
                </span>
              </div>
            </div>

            <div className="md-head__actions">
              {!isInvoiced && isNotRecorded && (
                <Button
                  size="large"
                  className="md-btn md-btn--outline"
                  icon={<EditOutlined />}
                  onClick={() => setFormOpen(true)}
                >
                  Nhập chỉ số
                </Button>
              )}

              {!isInvoiced && !isNotRecorded && (
                <Button
                  size="large"
                  className="md-btn md-btn--outline"
                  icon={<EditOutlined />}
                  onClick={() => setFormOpen(true)}
                >
                  Sửa chỉ số
                </Button>
              )}

              {isInvoiced && detail?.invoiceId && (
                <Button
                  type="primary"
                  size="large"
                  className="md-btn"
                  icon={<FileDoneOutlined />}
                  onClick={() => navigate(ROUTES.invoice(detail.invoiceId))}
                >
                  Xem hóa đơn
                </Button>
              )}
            </div>
          </header>

          {/* BANNER */}
          {banner && (
            <div
              className={`md-banner md-banner--${banner.tone}`}
              role="status"
            >
              <span className="md-banner__icon" aria-hidden="true">
                {banner.tone === "success" ? (
                  <CheckCircleFilled />
                ) : (
                  <InfoCircleFilled />
                )}
              </span>
              <div className="md-banner__body">
                <b>{banner.title}</b>
                <span>{banner.text}</span>
              </div>
            </div>
          )}

          <div className="md-layout">
            {/* CỘT TRÁI */}
            <div className="md-main">
              {/* CHỈ SỐ KỲ NÀY */}
              <section className="md-card" aria-label="Chỉ số kỳ này">
                <h2 className="md-card__title">
                  Chỉ số kỳ {month}/{year}
                </h2>
                <div className="md-meters">
                  <MeterCard
                    kind="elec"
                    title="Điện"
                    unit="kWh"
                    icon={<ThunderboltOutlined />}
                    start={reading?.electricityStart}
                    end={reading?.electricityEnd}
                    consumption={reading?.electricityConsumption}
                    price={detail?.electricityPrice}
                  />

                  <MeterCard
                    kind="water"
                    title="Nước"
                    unit="m³"
                    icon={<ExperimentOutlined />}
                    start={reading?.waterStart}
                    end={reading?.waterEnd}
                    consumption={reading?.waterConsumption}
                    price={detail?.waterPrice}
                  />
                </div>
              </section>

              {/* LỊCH SỬ */}
              <section className="md-card" aria-label="Lịch sử chỉ số">
                <div className="md-card__head">
                  <h2 className="md-card__title">Lịch sử chỉ số</h2>
                  <span className="md-muted">
                    {history.totalItems} kỳ ghi chỉ số
                  </span>
                </div>

                <div className="md-filter">
                  <label className="md-filter__field">
                    <span className="md-lbl">Tháng</span>
                    <CommonSelect
                      placeholder="Tất cả"
                      value={historyFilter.billingMonth}
                      options={MONTH_OPTIONS}
                      onChange={(value) =>
                        updateHistoryFilter("billingMonth", value)
                      }
                      style={{ width: "100%" }}
                    />
                  </label>

                  <label className="md-filter__field">
                    <span className="md-lbl">Năm</span>
                    <CommonSelect
                      placeholder="Tất cả"
                      value={historyFilter.billingYear}
                      options={YEAR_OPTIONS}
                      onChange={(value) =>
                        updateHistoryFilter("billingYear", value)
                      }
                      style={{ width: "100%" }}
                    />
                  </label>

                  <Button
                    className="md-btn md-btn--outline"
                    onClick={clearHistoryFilter}
                  >
                    Xóa lọc
                  </Button>
                </div>

                <Spin spinning={historyLoading}>
                  <div className="md-table">
                    <div className="md-table__inner">
                      <div className="md-hrow md-hrow--head" role="row">
                        <span>Kỳ</span>
                        <span>Điện (kWh)</span>
                        <span>Nước (m³)</span>
                        <span>Ngày ghi</span>
                        <span>Trạng thái</span>
                      </div>

                      {history.items.map((item) => (
                        <Link
                          key={item.id}
                          to={periodLink(item.billingMonth, item.billingYear)}
                          className={`md-hrow md-hrow--link${
                            item.billingMonth === month &&
                            item.billingYear === year
                              ? " is-current"
                              : ""
                          }`}
                          role="row"
                        >
                          <b>
                            {item.billingMonth}/{item.billingYear}
                          </b>
                          <span>
                            {formatRange(
                              item.electricityStart,
                              item.electricityEnd,
                              item.electricityConsumption,
                            )}
                          </span>
                          <span>
                            {formatRange(
                              item.waterStart,
                              item.waterEnd,
                              item.waterConsumption,
                            )}
                          </span>
                          <span>{formatDate(item.recordedDate)}</span>
                          <StatusChip status={item.status} />
                        </Link>
                      ))}

                      {!historyLoading && history.items.length === 0 && (
                        <div className="md-empty">
                          Không có kỳ nào khớp bộ lọc.
                        </div>
                      )}
                    </div>
                  </div>
                </Spin>

                <div className="md-card__head">
                  <span className="md-muted">
                    Hiển thị {from}–{to} trên {history.totalItems} kỳ
                  </span>

                  <Pagination
                    current={historyPage}
                    pageSize={HISTORY_PAGE_SIZE}
                    total={history.totalItems}
                    onChange={(page) => setHistoryPage(page)}
                    showSizeChanger={false}
                    hideOnSinglePage
                  />
                </div>
              </section>
            </div>

            {/* CỘT PHẢI */}
            <aside className="md-side">
              <section
                className="md-card"
                aria-label="Thông tin phòng và ghi nhận"
              >
                <h2 className="md-card__title">Thông tin điện nước</h2>

                <dl className="md-dl">
                  <InfoRow label="Phòng">{roomInfo?.roomNumber || "—"}</InfoRow>

                  <InfoRow label="Tòa nhà">{buildingName || "—"}</InfoRow>

                  <>
                    <InfoRow label="Khách thuê">{tenantName || "—"}</InfoRow>
                    <InfoRow label="Hợp đồng">{contractCode || "—"}</InfoRow>
                  </>
                  <InfoRow label="Giá điện">
                    {detail?.electricityPrice != null
                      ? `${formatMoney(detail.electricityPrice)} đ/kWh`
                      : "—"}
                  </InfoRow>

                  <InfoRow label="Giá nước">
                    {detail?.waterPrice != null
                      ? `${formatMoney(detail.waterPrice)} đ/m³`
                      : "—"}
                  </InfoRow>
                  <InfoRow label="Ngày ghi">
                    {formatDate(detail?.recordedDate)}
                  </InfoRow>

                  <InfoRow label="Ghi chú">{detail?.note || "—"}</InfoRow>
                </dl>
              </section>

              <section className="md-card" aria-label="Thông tin hệ thống">
                <h2 className="md-card__title">Thông tin hệ thống</h2>

                <dl className="md-dl">
                  <InfoRow label="ID điện nước">{detail?.id || "—"}</InfoRow>

                  <InfoRow label="Người ghi">
                    {detail?.createdBy || "—"}
                  </InfoRow>

                  <InfoRow label="Ngày tạo">
                    {detail?.createdAt
                      ? dayjs(detail.createdAt).format("DD/MM/YYYY HH:mm")
                      : "—"}
                  </InfoRow>

                  <InfoRow label="Ngày sửa">
                    {detail?.updatedAt
                      ? dayjs(detail.updatedAt).format("DD/MM/YYYY HH:mm")
                      : "—"}
                  </InfoRow>
                </dl>
              </section>
            </aside>
          </div>
        </div>
      </Spin>

      {/* GHI / SỬA CHỈ SỐ */}
      {formOpen && (
        <MeterReadingForm
          isMode={detail?.id ? "edit" : "create"}
          record={formRecord}
          isModal={formOpen}
          hideModal={() => setFormOpen(false)}
          fetchMeterReadings={refreshData}
          notify={notify}
          setLoading={setLoading}
        />
      )}
    </Fragment>
  );
};

export default MeterReadingDetail;
