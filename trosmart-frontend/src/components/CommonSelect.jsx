import React from "react";
import { Select, Spin } from "antd";

const CommonSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Vui lòng lựa chọn",
  style,
  loading = false,
  allowClear = true,
  showSearch = true,
  disabled = false,
  notFoundContent = "Không có dữ liệu",
  optionFilterProp = "label",
  ...rest
}) => {
  return (
    <Select
      showSearch={showSearch}
      allowClear={allowClear}
      value={value}
      placeholder={placeholder}
      style={style}
      onChange={onChange}
      loading={loading}
      disabled={disabled}
      options={options}
      optionFilterProp={optionFilterProp}
      filterOption={(input, option) =>
        String(option?.label ?? "")
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      notFoundContent={loading ? <Spin size="small" /> : notFoundContent}
      {...rest}
    />
  );
};

export default CommonSelect;
