import React from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import "../assets/style/PageHeader.css";

const PageHeader = ({
  title,
  description,
  buttonText,
  onButtonClick,
  buttonIcon = <PlusOutlined />,
}) => (
  <div className="ph">
    {/* Tiêu đề và mô tả (mô tả ẩn trên điện thoại bằng CSS) */}
    <div className="ph__text">
      <h1 className="ph__title">{title}</h1>
      {description && <p className="ph__desc">{description}</p>}
    </div>

    {/* Nút thao tác */}
    {buttonText && onButtonClick && (
      <Button
        type="primary"
        className="ph__btn"
        icon={buttonIcon}
        onClick={onButtonClick}
      >
        {buttonText}
      </Button>
    )}
  </div>
);

export default PageHeader;
