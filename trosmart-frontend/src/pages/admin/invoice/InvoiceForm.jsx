import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, DatePicker, Input, InputNumber, Select } from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  LockOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { generatePath, useNavigate } from "react-router-dom";
import {
  createInvoice,
  getAvailableContracts,
  previewInvoice,
} from "../../../api/invoiceApi";
import { useNotify } from "../../../components/NotificationProvider";
import { path_name } from "../../../constants/path_name";
import "./InvoiceForm.css";

const { TextArea } = Input;

// Mã lỗi BE trả về (ErrorCode)
const CODE_DUPLICATE_PERIOD = 4105;
const CODE_METER_MISSING = 4107;

const DATE_FORMAT = "DD/MM/YYYY";
const API_DATE_FORMAT = "YYYY-MM-DD";

const ITEM_LABELS = {
  ROOM_FEE: "Tiền phòng",
  ELECTRICITY: "Điện",
  WATER: "Nước",
  SERVICE: "Dịch vụ",
  SURCHARGE: "Phụ phí",
  DISCOUNT: "Giảm giá",
};

const PAYMENT_CYCLE_LABELS = {
  MONTHLY: "Hằng tháng",
  QUARTERLY: "Hằng quý",
  HALF_YEARLY: "Nửa năm",
  YEARLY: "Hằng năm",
};

const today = dayjs();
const CURRENT_MONTH = today.month() + 1;
const CURRENT_YEAR = today.year();

// Kỳ ở tương lai không lập được hóa đơn
const isFuturePeriod = (month, year) =>
  year > CURRENT_YEAR || (year === CURRENT_YEAR && month > CURRENT_MONTH);

const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map(
  (year) => ({ value: year, label: `Năm ${year}` }),
);

// Tiền hiển thị kiểu 100,000đ (dấu phẩy ngăn cách hàng nghìn)
const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}đ`;

const formatQuantity = (value) =>
  Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

// Ô nhập tiền: hiển thị 100,000 và đọc ngược về số
const moneyFormatter = (value) =>
  `${value ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const moneyParser = (value) => (value || "").replace(/,/g, "");

const formatPeriod = (month, year) =>
  `${String(month).padStart(2, "0")}/${year}`;

const sumAmount = (items, type) =>
  items
    .filter((item) => item.itemType === type)
    .reduce((total, item) => total + Number(item.amount || 0), 0);

const InvoiceForm = () => {
  const { notify, contextHolder } = useNotify();
  const navigate = useNavigate();

  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  // Mã tăng dần cho dòng nhập tay
  const nextKey = useRef(1);

  // =========================
  // BƯỚC 1: HỢP ĐỒNG VÀ KỲ
  // =========================
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [contractId, setContractId] = useState(undefined);

  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // =========================
  // BƯỚC 2: DÒNG HÓA ĐƠN
  // =========================
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [meterMissing, setMeterMissing] = useState(false);

  const [manualItems, setManualItems] = useState([]);

  const [issueDate, setIssueDate] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [note, setNote] = useState("");

  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedContract = useMemo(
    () => contracts.find((item) => item.contractId === contractId),
    [contracts, contractId],
  );

  // =========================
  // TẢI HỢP ĐỒNG CHƯA CÓ HÓA ĐƠN TRONG KỲ
  // =========================
  useEffect(() => {
    let cancelled = false;

    const loadContracts = async () => {
      setContractsLoading(true);

      try {
        const data = await getAvailableContracts({
          billingMonth: month,
          billingYear: year,
        });

        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];
        setContracts(list);
        setContractId((prev) =>
          list.some((item) => item.contractId === prev)
            ? prev
            : list[0]?.contractId,
        );
      } catch (error) {
        if (cancelled) return;

        setContracts([]);
        setContractId(undefined);

        notifyRef.current({
          type: "error",
          message: "Không thể tải danh sách hợp đồng",
          description:
            error?.response?.data?.message ||
            "Vui lòng kiểm tra kết nối đến máy chủ.",
        });
      } finally {
        if (!cancelled) setContractsLoading(false);
      }
    };

    loadContracts();

    return () => {
      cancelled = true;
    };
  }, [month, year, reloadKey]);

  // Đổi hợp đồng hoặc kỳ thì phải tính lại
  useEffect(() => {
    setPreview(null);
    setMeterMissing(false);
  }, [contractId, month, year]);

  // =========================
  // TÍNH HÓA ĐƠN (xem trước, chưa lưu)
  // =========================
  const handleCompute = async () => {
    if (!contractId || previewing) return;

    setPreviewing(true);
    setMeterMissing(false);
    setPreview(null);
    setShowErrors(false);

    try {
      const data = await previewInvoice({
        contractId,
        billingMonth: month,
        billingYear: year,
      });

      setPreview({
        items: data?.items ?? [],
        totalAmount: data?.totalAmount ?? 0,
      });

      const now = dayjs();
      setIssueDate(now);
      setDueDate(
        selectedContract?.suggestedDueDate
          ? dayjs(selectedContract.suggestedDueDate)
          : now.add(7, "day"),
      );
    } catch (error) {
      const code = error?.response?.data?.code;

      if (code === CODE_METER_MISSING) {
        setMeterMissing(true);
      } else {
        if (code === CODE_DUPLICATE_PERIOD) {
          // Có người vừa lập hóa đơn cho hợp đồng này: tải lại danh sách
          setReloadKey((key) => key + 1);
        }

        notifyRef.current({
          type: "error",
          message: "Không thể tính hóa đơn",
          description:
            error?.response?.data?.message || "Vui lòng thử lại sau.",
        });
      }
    } finally {
      setPreviewing(false);
    }
  };

  // =========================
  // DÒNG NHẬP TAY (phụ phí / giảm giá)
  // =========================
  const addManualItem = (itemType) => {
    setManualItems((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        itemType,
        itemName: "",
        quantity: 1,
        unitPrice: null,
      },
    ]);
  };

  const updateManualItem = (key, patch) => {
    setManualItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeManualItem = (key) => {
    setManualItems((prev) => prev.filter((item) => item.key !== key));
  };

  // =========================
  // TỔNG KẾT
  // =========================
  const totals = useMemo(() => {
    const autoItems = preview?.items ?? [];

    const surcharge = manualItems
      .filter((item) => item.itemType === "SURCHARGE")
      .reduce(
        (total, item) =>
          total + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      );

    const discount = manualItems
      .filter((item) => item.itemType === "DISCOUNT")
      .reduce(
        (total, item) =>
          total + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      );

    const room = sumAmount(autoItems, "ROOM_FEE");
    const electricity = sumAmount(autoItems, "ELECTRICITY");
    const water = sumAmount(autoItems, "WATER");
    const service = sumAmount(autoItems, "SERVICE");

    return {
      room,
      electricity,
      water,
      service,
      surcharge,
      discount,
      total: room + electricity + water + service + surcharge - discount,
    };
  }, [preview, manualItems]);

  // =========================
  // KIỂM TRA TRƯỚC KHI LƯU
  // =========================
  const errors = useMemo(() => {
    const list = [];

    if (!issueDate) list.push("Vui lòng chọn ngày lập.");
    if (!dueDate) list.push("Vui lòng chọn hạn thanh toán.");
    if (issueDate && dueDate && dueDate.isBefore(issueDate, "day")) {
      list.push("Hạn thanh toán không được trước ngày lập.");
    }

    manualItems.forEach((item, index) => {
      const label = `${ITEM_LABELS[item.itemType]} dòng ${index + 1}`;

      if (!item.itemName.trim()) list.push(`${label}: nhập tên khoản.`);
      if (!(Number(item.quantity) > 0))
        list.push(`${label}: số lượng phải lớn hơn 0.`);
      if (!(Number(item.unitPrice) > 0))
        list.push(`${label}: đơn giá phải lớn hơn 0.`);
    });

    if (note.length > 1000)
      list.push("Ghi chú không được vượt quá 1000 ký tự.");
    if (totals.total <= 0) list.push("Tổng tiền hóa đơn phải lớn hơn 0.");

    return list;
  }, [issueDate, dueDate, manualItems, note, totals.total]);

  // =========================
  // LƯU HÓA ĐƠN
  // =========================
  const handleSubmit = async () => {
    if (!preview || submitting) return;

    setShowErrors(true);
    if (errors.length > 0) return;

    setSubmitting(true);

    try {
      const result = await createInvoice({
        contractId,
        billingMonth: month,
        billingYear: year,
        issueDate: issueDate.format(API_DATE_FORMAT),
        dueDate: dueDate.format(API_DATE_FORMAT),
        note: note.trim() || undefined,
        items: manualItems.map((item) => ({
          itemName: item.itemName.trim(),
          itemType: item.itemType,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });

      notifyRef.current({
        type: "success",
        message: "Lập hóa đơn thành công!",
        description: result?.invoiceCode
          ? `Mã hóa đơn: ${result.invoiceCode}`
          : undefined,
      });

      if (result?.id) {
        navigate(
          generatePath(path_name.invoiceDetail, { invoiceId: result.id }),
        );
      } else {
        navigate(path_name.invoice);
      }
    } catch (error) {
      const code = error?.response?.data?.code;

      if (code === CODE_DUPLICATE_PERIOD) {
        setPreview(null);
        setReloadKey((key) => key + 1);
      }

      notifyRef.current({
        type: "error",
        message: "Lập hóa đơn thất bại!",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goToList = useCallback(() => navigate(path_name.invoice), [navigate]);

  // =========================
  // TÙY CHỌN
  // =========================
  const contractOptions = contracts.map((item) => ({
    value: item.contractId,
    label: [
      item.contractCode,
      `Phòng ${item.roomNumber}`,
      item.buildingName,
      item.tenantName,
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: `Tháng ${index + 1}`,
    disabled: isFuturePeriod(index + 1, year),
  }));

  const handleYearChange = (value) => {
    setYear(value);
    // Đổi sang năm hiện tại mà tháng đang chọn ở tương lai thì lùi về tháng hiện tại
    if (isFuturePeriod(month, value)) setMonth(CURRENT_MONTH);
  };

  const period = formatPeriod(month, year);
  const hasContracts = contracts.length > 0;
  const showNoContracts = !contractsLoading && !hasContracts;

  // =========================
  // RENDER
  // =========================
  return (
    <Fragment>
      {contextHolder}

      <div className="inv-form">
        {/* ===== TIÊU ĐỀ ===== */}
        <div className="inv-head">
          <div className="inv-head__left">
            <button
              type="button"
              className="inv-back"
              onClick={goToList}
              aria-label="Quay lại danh sách hóa đơn"
            >
              <ArrowLeftOutlined />
            </button>

            <div className="inv-head__text">
              <h1 className="inv-title">Lập hóa đơn</h1>
              <span className="inv-sub">
                Chọn hợp đồng và kỳ, hệ thống tự dựng các dòng tiền từ hợp đồng
                và điện nước.
              </span>
            </div>
          </div>

          <div className="inv-actions">
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!preview}
            >
              Lưu hóa đơn
            </Button>
          </div>
        </div>

        {/* ===== 1. CHỌN HỢP ĐỒNG VÀ KỲ ===== */}
        <section className="inv-card" aria-label="Hợp đồng và kỳ">
          <h2 className="inv-card__title">1. Chọn hợp đồng và kỳ</h2>

          <div className="inv-pick">
            <div className="inv-field inv-pick__contract">
              <label htmlFor="inv-contract">
                Hợp đồng <i>*</i>
              </label>
              <Select
                id="inv-contract"
                showSearch
                optionFilterProp="label"
                placeholder={
                  showNoContracts ? "Không có hợp đồng" : "Chọn hợp đồng"
                }
                loading={contractsLoading}
                disabled={!hasContracts}
                value={contractId}
                options={contractOptions}
                onChange={setContractId}
              />
            </div>

            <div className="inv-field">
              <label htmlFor="inv-month">
                Tháng <i>*</i>
              </label>
              <Select
                id="inv-month"
                value={month}
                options={monthOptions}
                onChange={setMonth}
              />
            </div>

            <div className="inv-field">
              <label htmlFor="inv-year">
                Năm <i>*</i>
              </label>
              <Select
                id="inv-year"
                value={year}
                options={YEAR_OPTIONS}
                onChange={handleYearChange}
              />
            </div>

            <div>
              <Button
                block
                type="primary"
                loading={previewing}
                disabled={!hasContracts || !contractId}
                onClick={handleCompute}
              >
                Tính hóa đơn
              </Button>
            </div>
          </div>

          <span className="inv-hint">
            Chỉ hiện hợp đồng chưa có hóa đơn kỳ {period}
          </span>

          {selectedContract && (
            <div className="inv-info">
              <div className="inv-info__item">
                <span className="inv-info__label">Phòng</span>
                <span className="inv-info__value">
                  {selectedContract.roomNumber} ·{" "}
                  {selectedContract.buildingName}
                </span>
              </div>
              <div className="inv-info__item">
                <span className="inv-info__label">Khách thuê</span>
                <span className="inv-info__value">
                  {selectedContract.tenantName || "—"}
                </span>
              </div>
              <div className="inv-info__item">
                <span className="inv-info__label">Giá thuê</span>
                <span className="inv-info__value">
                  {formatMoney(selectedContract.rentPrice)} / tháng
                </span>
              </div>
              <div className="inv-info__item">
                <span className="inv-info__label">Chu kỳ thanh toán</span>
                <span className="inv-info__value">
                  {PAYMENT_CYCLE_LABELS[selectedContract.paymentCycle] ||
                    selectedContract.paymentCycle ||
                    "—"}
                </span>
              </div>
            </div>
          )}

          {meterMissing && selectedContract && (
            <div className="inv-alert inv-alert--warn" role="alert">
              <div className="inv-alert__text">
                <b>
                  Phòng {selectedContract.roomNumber} chưa có chỉ số điện nước
                  kỳ {period}
                </b>
                <span>Cần ghi chỉ số điện và nước trước khi lập hóa đơn.</span>
              </div>
              <Button onClick={() => navigate(path_name.meter)}>
                Đi ghi chỉ số
              </Button>
            </div>
          )}

          {showNoContracts && (
            <div className="inv-alert inv-alert--info" role="status">
              <div className="inv-alert__text">
                <b>Tất cả hợp đồng đã có hóa đơn kỳ {period}</b>
                <span>
                  Không còn hợp đồng nào cần lập hóa đơn trong kỳ này.
                </span>
              </div>
              <Button onClick={goToList}>Xem danh sách hóa đơn</Button>
            </div>
          )}
        </section>

        {/* ===== 2. CÁC DÒNG HÓA ĐƠN ===== */}
        {preview && (
          <div className="inv-body">
            <div className="inv-main">
              <section className="inv-card" aria-label="Các dòng hóa đơn">
                <div className="inv-card__head">
                  <h2 className="inv-card__title">2. Các dòng hóa đơn</h2>
                  <span className="inv-card__note">
                    Dòng có khóa lấy tự động, không sửa được
                  </span>
                </div>

                <div className="inv-lines">
                  <div className="inv-lines__inner">
                    <div className="inv-line inv-line--head" role="row">
                      <span>Loại</span>
                      <span>Tên</span>
                      <span className="inv-num">Số lượng</span>
                      <span className="inv-num">Đơn giá</span>
                      <span className="inv-num">Thành tiền</span>
                      <span />
                    </div>

                    {preview.items.map((item) => (
                      <div
                        className="inv-line"
                        role="row"
                        key={`${item.itemType}-${item.itemName}`}
                      >
                        <span
                          className={`inv-chip inv-chip--${item.itemType} inv-line__kind`}
                        >
                          {ITEM_LABELS[item.itemType] || item.itemType}
                        </span>
                        <span className="inv-line__name">{item.itemName}</span>
                        <span
                          className="inv-num inv-line__qty"
                          data-label="Số lượng"
                        >
                          {formatQuantity(item.quantity)}
                        </span>
                        <span
                          className="inv-num inv-line__price"
                          data-label="Đơn giá"
                        >
                          {formatMoney(item.unitPrice)}
                        </span>
                        <b
                          className="inv-num inv-line__amount"
                          data-label="Thành tiền"
                        >
                          {formatMoney(item.amount)}
                        </b>
                        <span className="inv-line__action" title="Tự động">
                          <LockOutlined />
                        </span>
                      </div>
                    ))}

                    {manualItems.map((item) => {
                      const amount =
                        Number(item.quantity || 0) *
                        Number(item.unitPrice || 0);
                      const isDiscount = item.itemType === "DISCOUNT";

                      return (
                        <div
                          className="inv-line inv-line--manual"
                          role="row"
                          key={item.key}
                        >
                          <span
                            className={`inv-chip inv-chip--${item.itemType} inv-line__kind`}
                          >
                            {ITEM_LABELS[item.itemType]}
                          </span>

                          <div className="inv-line__name">
                            <Input
                              aria-label="Tên dòng"
                              placeholder="Tên khoản"
                              maxLength={255}
                              value={item.itemName}
                              status={
                                showErrors && !item.itemName.trim()
                                  ? "error"
                                  : undefined
                              }
                              onChange={(event) =>
                                updateManualItem(item.key, {
                                  itemName: event.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="inv-line__qty" data-label="Số lượng">
                            <InputNumber
                              aria-label="Số lượng"
                              min={1}
                              precision={0}
                              value={item.quantity}
                              onChange={(value) =>
                                updateManualItem(item.key, { quantity: value })
                              }
                            />
                          </div>

                          <div className="inv-line__price" data-label="Đơn giá">
                            <InputNumber
                              aria-label="Đơn giá"
                              min={0}
                              precision={0}
                              placeholder="0"
                              value={item.unitPrice}
                              status={
                                showErrors && !(Number(item.unitPrice) > 0)
                                  ? "error"
                                  : undefined
                              }
                              formatter={moneyFormatter}
                              parser={moneyParser}
                              onChange={(value) =>
                                updateManualItem(item.key, { unitPrice: value })
                              }
                            />
                          </div>

                          <b
                            className={`inv-num inv-line__amount${
                              isDiscount ? " inv-amount--minus" : ""
                            }`}
                            data-label="Thành tiền"
                          >
                            {isDiscount && amount > 0 ? "-" : ""}
                            {formatMoney(amount)}
                          </b>

                          <span className="inv-line__action">
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              aria-label="Xóa dòng"
                              onClick={() => removeManualItem(item.key)}
                            />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="inv-add">
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addManualItem("SURCHARGE")}
                  >
                    Thêm phụ phí
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addManualItem("DISCOUNT")}
                  >
                    Thêm giảm giá
                  </Button>
                </div>

                <span className="inv-hint">
                  Giảm giá nhập số dương, hệ thống tự trừ vào tổng. Sau khi lưu
                  không sửa được các dòng.
                </span>

                {showErrors && errors.length > 0 && (
                  <div role="alert">
                    {errors.map((message) => (
                      <div className="inv-error" key={message}>
                        {message}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="inv-side">
              <section className="inv-card" aria-label="Thông tin hóa đơn">
                <h2 className="inv-card__title">Thông tin hóa đơn</h2>

                <div className="inv-field">
                  <label htmlFor="inv-issue">
                    Ngày lập <i>*</i>
                  </label>
                  <DatePicker
                    id="inv-issue"
                    format={DATE_FORMAT}
                    allowClear={false}
                    value={issueDate}
                    disabledDate={(date) => date.isAfter(dayjs(), "day")}
                    onChange={(value) => {
                      setIssueDate(value);
                      // Hạn không được trước ngày lập
                      if (value && dueDate && dueDate.isBefore(value, "day")) {
                        setDueDate(value);
                      }
                    }}
                  />
                </div>

                <div className="inv-field">
                  <label htmlFor="inv-due">
                    Hạn thanh toán <i>*</i>
                  </label>
                  <DatePicker
                    id="inv-due"
                    format={DATE_FORMAT}
                    allowClear={false}
                    value={dueDate}
                    disabledDate={(date) =>
                      Boolean(issueDate) && date.isBefore(issueDate, "day")
                    }
                    onChange={setDueDate}
                  />
                  {selectedContract?.paymentDueDay && (
                    <span className="inv-hint">
                      Gợi ý theo ngày {selectedContract.paymentDueDay} hằng
                      tháng của hợp đồng
                    </span>
                  )}
                </div>

                <div className="inv-field">
                  <label htmlFor="inv-note">Ghi chú</label>
                  <TextArea
                    id="inv-note"
                    rows={3}
                    maxLength={1000}
                    value={note}
                    placeholder="VD: Đã giảm giá cho khách lâu năm"
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
              </section>

              <section className="inv-card" aria-label="Tổng kết">
                <h2 className="inv-card__title">Tổng kết</h2>

                <div>
                  <div className="inv-total-row">
                    <span>Tiền phòng</span>
                    <b>{formatMoney(totals.room)}</b>
                  </div>
                  <div className="inv-total-row">
                    <span>Điện</span>
                    <b>{formatMoney(totals.electricity)}</b>
                  </div>
                  <div className="inv-total-row">
                    <span>Nước</span>
                    <b>{formatMoney(totals.water)}</b>
                  </div>
                  <div className="inv-total-row">
                    <span>Dịch vụ</span>
                    <b>{formatMoney(totals.service)}</b>
                  </div>
                  <div className="inv-total-row">
                    <span>Phụ phí</span>
                    <b>{formatMoney(totals.surcharge)}</b>
                  </div>
                  <div className="inv-total-row">
                    <span>Giảm giá</span>
                    <b className="inv-amount--minus">
                      {totals.discount > 0 ? "-" : ""}
                      {formatMoney(totals.discount)}
                    </b>
                  </div>
                </div>

                <div className="inv-total-box">
                  <span>Tổng phải trả</span>
                  <strong>{formatMoney(totals.total)}</strong>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default InvoiceForm;
