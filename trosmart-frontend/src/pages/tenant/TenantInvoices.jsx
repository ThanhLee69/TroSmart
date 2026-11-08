import { useMemo, useState } from "react";
import { Segmented } from "antd";
import { useNavigate } from "react-router-dom";
import { CheckCircleFilled } from "@ant-design/icons";
import { getMyInvoices } from "../../api/myTenantApi";
import { tenant_path_name } from "../../constants/path_name";
import {
  AsyncBlock,
  PageHead,
  formatDate,
  formatMoney,
  useLoad,
} from "./tenantUi";
import { isOpen, statusKeyOf, statusMetaOf } from "./invoiceMeta";

const TABS = {
  ALL: "ALL",
  OPEN: "OPEN",
  PAID: "PAID",
};

export default function TenantInvoices() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(TABS.ALL);

  // Lấy tối đa 100 hóa đơn mới nhất rồi lọc ngay trên máy
  const invoices = useLoad(() => getMyInvoices({ page: 1, size: 100 }), []);
  const list = invoices.data?.items ?? [];

  const open = useMemo(() => list.filter(isOpen), [list]);
  const paid = useMemo(() => list.filter((i) => i.status === "PAID"), [list]);

  const shown = tab === TABS.OPEN ? open : tab === TABS.PAID ? paid : list;

  const totalDue = open.reduce(
    (sum, i) => sum + Number(i.remainingAmount ?? 0),
    0,
  );
  const overdueCount = open.filter((i) => i.overdue).length;

  const openDetail = (id) =>
    navigate(tenant_path_name.invoiceDetail.replace(":id", id));

  return (
    <div className="tn-page tv-page">
      <PageHead
        title="Hóa đơn"
        desc="Hóa đơn tiền phòng và dịch vụ hàng tháng."
      />

      <AsyncBlock
        loading={invoices.loading}
        error={invoices.error}
        onRetry={invoices.reload}
        isEmpty={list.length === 0}
        emptyText="Bạn chưa có hóa đơn nào"
      >
        {/* Tổng nợ */}
        <div className={`tv-sum${totalDue > 0 ? "" : " is-clear"}`}>
          {totalDue > 0 ? (
            <>
              <small>Còn phải đóng</small>
              <div className="tv-sum__amount">{formatMoney(totalDue)}</div>
              <p>
                {open.length} hóa đơn chưa đóng
                {overdueCount > 0 && ` · ${overdueCount} hóa đơn quá hạn`}
              </p>
            </>
          ) : (
            <div className="tv-sum__ok">
              <CheckCircleFilled />
              <span>Bạn đã thanh toán đủ</span>
            </div>
          )}
        </div>

        {/* Bộ lọc */}
        <Segmented
          block
          className="ti-seg"
          value={tab}
          onChange={setTab}
          options={[
            { label: `Tất cả (${list.length})`, value: TABS.ALL },
            { label: `Chưa đóng (${open.length})`, value: TABS.OPEN },
            { label: `Đã đóng (${paid.length})`, value: TABS.PAID },
          ]}
        />

        {/* Danh sách */}
        {shown.length === 0 ? (
          <div className="tv-empty">Không có hóa đơn nào trong mục này.</div>
        ) : (
          <div className="tv-list">
            {shown.map((invoice) => {
              const meta = statusMetaOf(statusKeyOf(invoice));
              const remaining = Number(invoice.remainingAmount ?? 0);
              const total = Number(invoice.totalAmount ?? 0);
              const partial = invoice.status === "PARTIALLY_PAID";

              return (
                <button
                  type="button"
                  className="tv-item"
                  key={invoice.id}
                  style={{ "--acc": meta.c }}
                  onClick={() => openDetail(invoice.id)}
                >
                  <div className="tv-item__main">
                    <b>
                      Hóa đơn tháng {invoice.billingMonth}/{invoice.billingYear}
                    </b>
                    <span>Mã: {invoice.invoiceCode}</span>
                    <span>Hạn đóng: {formatDate(invoice.dueDate)}</span>
                  </div>

                  <div className="tv-item__side">
                    <strong>
                      {formatMoney(remaining > 0 ? remaining : total)}
                    </strong>
                    <span
                      className="tv-chip"
                      style={{ "--bg": meta.bg, "--c": meta.c }}
                    >
                      {meta.label}
                    </span>
                    {partial && (
                      <small>
                        Đã đóng {formatMoney(invoice.paidAmount)} /{" "}
                        {formatMoney(total)}
                      </small>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </AsyncBlock>
    </div>
  );
}
