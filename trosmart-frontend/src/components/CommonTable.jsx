import React from "react";
import { Table, Pagination } from "antd";

const CommonTable = ({
  columns,
  dataSource = [],
  rowKey = "id",
  loading = false,
  pagination,
  onPageChange,
  emptyText = "Không có dữ liệu",
  totalText = "kết quả",
  scrollX = 1200,
  size = "middle",
  showSizeChanger = true,
  pageSizeOptions = ["5", "10", "20", "50"],
}) => {
  const currentPage = pagination?.page ?? 1;
  const pageSize = pagination?.size ?? 10;
  const totalItems = pagination?.totalItems ?? 0;

  return (
    <>
      <Table
        size={size}
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        pagination={false}
        scroll={{ x: "max-content" }}
        tableLayout="fixed"
        locale={{
          emptyText,
        }}
      />

      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={totalItems}
        showSizeChanger={showSizeChanger}
        pageSizeOptions={pageSizeOptions}
        onChange={onPageChange}
        style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "flex-end",
        }}
        showTotal={(total, range) =>
          `Hiển thị ${range[0]}-${range[1]} trong ${total} ${totalText}`
        }
      />
    </>
  );
};

export default CommonTable;
