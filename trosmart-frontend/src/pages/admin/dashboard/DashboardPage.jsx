import React, { useEffect, useMemo, useState } from "react";
import { Button, Segmented, Select, Spin, Table } from "antd";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  DollarOutlined,
  HomeOutlined,
  KeyOutlined,
  LeftOutlined,
  MessageOutlined,
  RightOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { path_name } from "../../../constants/path_name"; // đổi cho đúng thư mục của bạn
import { getDashboardSummary, getRevenue } from "../../../api/dashboardApi";
import "../../../assets/style/PageHeader.css"; // dùng chung kiểu tiêu đề với các trang khác
import "./DashboardPage.css";

/* ---------- Định dạng ---------- */

const vnd = (n) => `${Number(n || 0).toLocaleString("vi-VN")}đ`;

// 96.400.000 -> "96,4 tr"
const short = (n) => {
  const million = Number(n || 0) / 1000000;
  return `${Number.isInteger(million) ? million : million.toFixed(1).replace(".", ",")} tr`;
};

const percent = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

const TODO_ICONS = {
  overdue: <WarningOutlined />,
  issue: <ToolOutlined />,
  expiring: <CalendarOutlined />,
  meter: <ThunderboltOutlined />,
  contact: <MessageOutlined />,
};

// Trạng thái phòng: nhãn và màu dùng chung cho thanh và chú thích
const ROOM_STATES = [
  { key: "rented", label: "Đang thuê", color: "#4a5be0" },
  { key: "reserved", label: "Đặt cọc", color: "#f0a23a" },
  { key: "available", label: "Còn trống", color: "#3ec5a5" },
  { key: "maintenance", label: "Bảo trì", color: "#c3c9e0" },
];

/* Ô phòng: số phòng đậm, tên tòa nhỏ bên dưới */
const roomCell = (_, r) => (
  <span className="dash-room">
    <b>{r.room}</b>
    <span>{r.building}</span>
  </span>
);

/* Nhãn số ngày: nền màu nhạt, không viền */
const Pill = ({ tone, children }) => (
  <span className={`dash-pill dash-pill--${tone}`}>{children}</span>
);

/* ---------- Thành phần nhỏ ---------- */

function Panel({ title, extra, children, className = "" }) {
  return (
    <section className={`dash-panel ${className}`}>
      <header className="dash-panel__head">
        <h2 className="dash-panel__title">{title}</h2>
        {extra}
      </header>
      {children}
    </section>
  );
}

function StatCard({ label, value, hint, children, icon, tone = "blue" }) {
  return (
    <div className={`dash-stat dash-stat--${tone}`}>
      <span className="dash-stat__icon">{icon}</span>
      <span className="dash-stat__label">{label}</span>
      <strong className="dash-stat__value">{value}</strong>
      {children}
      {hint && <span className="dash-stat__hint">{hint}</span>}
    </div>
  );
}

/* Biểu đồ vòng: tỷ lệ các trạng thái phòng, số ở giữa là % đang thuê */
function RoomDonut({ totals, total }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const gap = total > 1 ? 3 : 0;
  let offset = 0;

  const segments = ROOM_STATES.filter((st) => totals[st.key] > 0).map((st) => {
    const len = (totals[st.key] / total) * c;
    const seg = { ...st, dash: Math.max(len - gap, 0.01), offset };
    offset += len;
    return seg;
  });

  return (
    <svg
      className="dash-donut"
      viewBox="0 0 160 160"
      role="img"
      aria-label="Trạng thái phòng"
    >
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke="#eef0fb"
        strokeWidth="18"
      />
      {segments.map((seg) => (
        <circle
          key={seg.key}
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth="18"
          strokeDasharray={`${seg.dash} ${c - seg.dash}`}
          strokeDashoffset={-seg.offset}
          transform="rotate(-90 80 80)"
        />
      ))}
      <text x="80" y="78" textAnchor="middle" className="dash-donut__num">
        {percent(totals.rented, total)}%
      </text>
      <text x="80" y="98" textAnchor="middle" className="dash-donut__cap">
        đang thuê
      </text>
    </svg>
  );
}

/* Biểu đồ cột đôi: đã thu và phải thu, 12 tháng */
function RevenueChart({ rows }) {
  const max = Math.max(
    0,
    ...rows.flatMap((r) => [r.collected || 0, r.expected || 0]),
  );
  const step = Math.max(10000000, Math.ceil(max / 4 / 10000000) * 10000000);
  const top = step * 4;
  const ticks = [4, 3, 2, 1, 0].map((i) => i * step);

  return (
    <div className="dash-chart">
      <div className="dash-chart__axis">
        {ticks.map((t) => (
          <span key={t}>{t === 0 ? "0" : short(t)}</span>
        ))}
      </div>

      <div className="dash-chart__plot">
        <div className="dash-chart__grid" aria-hidden="true">
          {ticks.map((t) => (
            <i key={t} />
          ))}
        </div>

        <div className="dash-chart__cols">
          {rows.map((row) => {
            const empty = row.collected == null;
            const debt = empty ? 0 : row.expected - row.collected;

            return (
              <div
                key={`${row.label}-${row.sub || ""}`}
                className="dash-chart__col"
              >
                <div className="dash-chart__pair">
                  {!empty && (
                    <>
                      <span
                        className="dash-bar dash-bar--expected"
                        style={{ height: `${(row.expected / top) * 100}%` }}
                      />
                      <span
                        className="dash-bar dash-bar--collected"
                        style={{ height: `${(row.collected / top) * 100}%` }}
                      />
                    </>
                  )}
                </div>

                <span className="dash-chart__label">
                  {row.label}
                  {row.sub && <small>/{row.sub}</small>}
                </span>

                {!empty && (
                  <div className="dash-tip" role="tooltip">
                    <b>
                      {row.label}
                      {row.sub ? `/${row.sub}` : ""}
                    </b>
                    <span>
                      <i className="dash-dot dash-dot--collected" /> Đã thu:{" "}
                      {vnd(row.collected)}
                    </span>
                    <span>
                      <i className="dash-dot dash-dot--expected" /> Phải thu:{" "}
                      {vnd(row.expected)}
                    </span>
                    <span>Còn nợ: {vnd(debt)}</span>
                    <span>{row.invoices} hóa đơn</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Trang tổng quan ---------- */

export default function DashboardPage() {
  const navigate = useNavigate();

  const nowYear = new Date().getFullYear();
  const yearOptions = [nowYear - 2, nowYear - 1, nowYear];

  const [buildingId, setBuildingId] = useState("all");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("year");
  const [year, setYear] = useState(nowYear);
  const [revenue, setRevenue] = useState({ rows: [], previousTotal: null });
  const [revenueLoading, setRevenueLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboardSummary({
      buildingId: buildingId === "all" ? undefined : buildingId,
    })
      .then((data) => !cancelled && setSummary(data))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  useEffect(() => {
    let cancelled = false;
    setRevenueLoading(true);
    getRevenue({
      mode,
      year,
      buildingId: buildingId === "all" ? undefined : buildingId,
    })
      .then((data) => !cancelled && setRevenue(data))
      .finally(() => !cancelled && setRevenueLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mode, year, buildingId]);

  const stats = useMemo(() => {
    const filled = revenue.rows.filter((r) => r.collected != null);
    const total = filled.reduce((s, r) => s + r.collected, 0);
    const best = filled.reduce(
      (a, b) => (!a || b.collected > a.collected ? b : a),
      null,
    );
    const change =
      revenue.previousTotal > 0
        ? Math.round(
            ((total - revenue.previousTotal) / revenue.previousTotal) * 100,
          )
        : null;

    return {
      total,
      avg: filled.length ? total / filled.length : 0,
      best,
      change,
    };
  }, [revenue]);

  const go = (key) => {
    const target = path_name[key];
    if (target) navigate(target);
  };

  if (loading && !summary) {
    return (
      <div className="dash dash--loading">
        <Spin size="large" />
      </div>
    );
  }

  const {
    occupancy,
    month,
    debt,
    todo,
    buildings,
    overdueInvoices,
    expiringContracts,
  } = summary;
  const visibleBuildings = buildings.filter(
    (b) => buildingId === "all" || b.id === buildingId,
  );
  const roomTotals = Object.fromEntries(
    ROOM_STATES.map((st) => [
      st.key,
      visibleBuildings.reduce((s, b) => s + b[st.key], 0),
    ]),
  );
  const roomTotal = ROOM_STATES.reduce((s, st) => s + roomTotals[st.key], 0);
  const filledPercent = percent(occupancy.rented, occupancy.total);
  const collectedPercent = percent(month.collected, month.expected);
  const today = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="dash">
      {/* Tiêu đề: dùng lại class của PageHeader để giống các trang khác */}
      <div className="ph">
        <div className="ph__text">
          <h1 className="ph__title">Tổng quan</h1>
          <p className="ph__desc">
            {today}. Tình hình nhà trọ và các việc cần xử lý.
          </p>
        </div>

        <div className="dash-building">
          <Select
            variant="borderless"
            className="dash-building__select"
            popupMatchSelectWidth={false}
            value={buildingId}
            onChange={setBuildingId}
            options={[
              { value: "all", label: "Tất cả tòa nhà" },
              ...buildings.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>
      </div>

      {/* Bốn thẻ số */}
      <div className="dash-stats">
        <StatCard
          icon={<KeyOutlined />}
          label="Tỷ lệ lấp đầy"
          value={`${filledPercent}%`}
          hint={`${occupancy.rented}/${occupancy.total} phòng đang thuê`}
        >
          <span className="dash-meter">
            <i style={{ width: `${filledPercent}%` }} />
          </span>
        </StatCard>

        <StatCard
          tone="green"
          icon={<DollarOutlined />}
          label="Đã thu tháng này"
          value={short(month.collected)}
          hint={`Phải thu ${short(month.expected)} (${collectedPercent}%)`}
        >
          <span className="dash-meter">
            <i style={{ width: `${collectedPercent}%` }} />
          </span>
        </StatCard>

        <StatCard
          tone="red"
          icon={<WarningOutlined />}
          label="Công nợ"
          value={short(debt.amount)}
          hint={`${debt.overdueCount} hóa đơn quá hạn`}
        />

        <StatCard
          tone="amber"
          icon={<HomeOutlined />}
          label="Phòng trống"
          value={occupancy.available}
          hint={`${occupancy.reserved} phòng đang đặt cọc`}
        />
      </div>

      {/* Việc cần xử lý + trạng thái phòng */}
      <div className="dash-grid">
        <Panel title="Việc cần xử lý">
          <ul className="dash-todo">
            {todo
              .filter((item) => item.count > 0)
              .map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    className="dash-todo__row"
                    onClick={() => go(item.path)}
                  >
                    <span
                      className={`dash-todo__icon dash-todo__icon--${item.tone}`}
                    >
                      {TODO_ICONS[item.key]}
                    </span>
                    <span className="dash-todo__label">{item.label}</span>
                    <span
                      className={`dash-todo__count dash-todo__count--${item.tone}`}
                    >
                      {item.count}
                    </span>
                    <ArrowRightOutlined className="dash-todo__go" />
                  </button>
                </li>
              ))}
          </ul>
        </Panel>

        <Panel title="Trạng thái phòng">
          <div className="dash-roomstate">
            <RoomDonut totals={roomTotals} total={roomTotal} />

            <ul className="dash-roomstate__list">
              {ROOM_STATES.map((st) => (
                <li key={st.key}>
                  <i style={{ background: st.color }} />
                  <span className="dash-roomstate__name">{st.label}</span>
                  <b>{roomTotals[st.key]}</b>
                  <em>{percent(roomTotals[st.key], roomTotal)}%</em>
                </li>
              ))}
            </ul>
          </div>

          {visibleBuildings.length > 1 && (
            <div className="dash-bldg">
              {visibleBuildings.map((b) => {
                const total = ROOM_STATES.reduce((s, st) => s + b[st.key], 0);
                return (
                  <div key={b.id} className="dash-bldg__row">
                    <span className="dash-bldg__name">{b.name}</span>
                    <span className="dash-bldg__bar">
                      {ROOM_STATES.map(
                        (st) =>
                          b[st.key] > 0 && (
                            <i
                              key={st.key}
                              title={`${st.label}: ${b[st.key]}`}
                              style={{ flex: b[st.key], background: st.color }}
                            />
                          ),
                      )}
                    </span>
                    <span className="dash-bldg__txt">
                      {b.rented}/{total} thuê
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Doanh thu */}
      <Panel
        title="Doanh thu"
        className="dash-revenue"
        extra={
          <div className="dash-revenue__tools">
            <Segmented
              className="dash-seg"
              value={mode}
              onChange={setMode}
              options={[
                { value: "year", label: "Theo năm" },
                { value: "last12", label: "12 tháng gần nhất" },
              ]}
            />

            {mode === "year" && (
              <div className="dash-year">
                <Button
                  type="text"
                  className="dash-year__btn"
                  icon={<LeftOutlined />}
                  disabled={year <= yearOptions[0]}
                  onClick={() => setYear(year - 1)}
                  aria-label="Năm trước"
                />
                <Select
                  variant="borderless"
                  className="dash-year__select"
                  popupMatchSelectWidth={false}
                  value={year}
                  onChange={setYear}
                  options={yearOptions.map((y) => ({
                    value: y,
                    label: `Năm ${y}`,
                  }))}
                />
                <Button
                  type="text"
                  className="dash-year__btn"
                  icon={<RightOutlined />}
                  disabled={year >= nowYear}
                  onClick={() => setYear(year + 1)}
                  aria-label="Năm sau"
                />
              </div>
            )}
          </div>
        }
      >
        <div className="dash-sum">
          <div>
            <span>Tổng đã thu</span>
            <strong>{short(stats.total)}</strong>
            {stats.change != null && (
              <em className={stats.change >= 0 ? "is-up" : "is-down"}>
                {stats.change >= 0 ? "▲" : "▼"} {Math.abs(stats.change)}% so với
                năm trước
              </em>
            )}
          </div>
          <div>
            <span>Trung bình mỗi tháng</span>
            <strong>{short(stats.avg)}</strong>
          </div>
          <div>
            <span>Tháng cao nhất</span>
            <strong>
              {stats.best
                ? `${stats.best.label} · ${short(stats.best.collected)}`
                : "—"}
            </strong>
          </div>
        </div>

        <Spin spinning={revenueLoading}>
          <RevenueChart rows={revenue.rows} />
        </Spin>

        <ul className="dash-legend dash-legend--chart">
          <li>
            <b className="dash-dot--collected" /> Đã thu
          </li>
          <li>
            <b className="dash-dot--expected" /> Phải thu
          </li>
        </ul>
      </Panel>

      {/* Hai bảng ngắn */}
      <div className="dash-grid">
        <Panel
          title="Hóa đơn quá hạn lâu nhất"
          extra={
            <Button type="link" size="small" onClick={() => go("invoice")}>
              Xem tất cả
            </Button>
          }
        >
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={overdueInvoices}
            onRow={() => ({
              onClick: () => go("invoice"),
              style: { cursor: "pointer" },
            })}
            columns={[
              { title: "Phòng", render: roomCell, width: 90 },
              {
                title: "Người thuê",
                dataIndex: "tenant",
                render: (name) => <span className="dash-person">{name}</span>,
              },
              {
                title: "Số tiền",
                dataIndex: "amount",
                align: "right",
                render: (v) => <span className="dash-money">{vnd(v)}</span>,
              },
              {
                title: "Quá hạn",
                dataIndex: "days",
                align: "right",
                render: (d) => (
                  <Pill tone={d >= 10 ? "danger" : "warning"}>{d} ngày</Pill>
                ),
              },
            ]}
          />
        </Panel>

        <Panel
          title="Hợp đồng sắp hết hạn"
          extra={
            <Button type="link" size="small" onClick={() => go("contract")}>
              Xem tất cả
            </Button>
          }
        >
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={expiringContracts}
            onRow={() => ({
              onClick: () => go("contract"),
              style: { cursor: "pointer" },
            })}
            columns={[
              { title: "Phòng", render: roomCell, width: 90 },
              {
                title: "Người thuê",
                dataIndex: "tenant",
                render: (name) => <span className="dash-person">{name}</span>,
              },
              {
                title: "Hết hạn",
                dataIndex: "endDate",
                render: (d) => new Date(d).toLocaleDateString("vi-VN"),
              },
              {
                title: "Còn lại",
                dataIndex: "days",
                align: "right",
                render: (d) => (
                  <Pill tone={d <= 7 ? "danger" : "warning"}>{d} ngày</Pill>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
