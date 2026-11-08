import React, { useEffect, useState } from "react";
import { Upload, Button, Image, Row, Col, Card, Tooltip, message } from "antd";
import {
  UploadOutlined,
  ProfileOutlined,
  CloseOutlined,
  EyeOutlined,
  CheckCircleFilled,
  StarOutlined,
  StarFilled,
} from "@ant-design/icons";
import { PiImage } from "react-icons/pi";
import "./RoomImageUpload.css";

const MAX_IMAGES = 9;

const RoomImageUpload = ({
  fileList = [],
  setFileList,
  onRemove = () => {},
  onSetThumbnail,
  maxCount = MAX_IMAGES,
  disabled = false,
}) => {
  const [previewUrls, setPreviewUrls] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [settingKey, setSettingKey] = useState(null);

  // Đồng bộ ảnh đại diện do backend trả về.
  useEffect(() => {
    const thumbnail = fileList.find((file) => file.isThumbnail);

    if (thumbnail) {
      setSelectedKey(thumbnail.id ?? thumbnail.uid);
    } else if (!fileList.length) {
      setSelectedKey(null);
    }
  }, [fileList]);

  // Tạo URL xem trước cho ảnh mới.
  useEffect(() => {
    const urls = {};

    fileList.forEach((file) => {
      if (file.originFileObj && !file.url) {
        urls[file.uid] = URL.createObjectURL(file.originFileObj);
      }
    });

    setPreviewUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [fileList]);

  const getImageKey = (file) => file.id ?? file.uid;

  const isThumbnail = (file) =>
    selectedKey != null && String(selectedKey) === String(getImageKey(file));

  const handleChange = (info) => {
    setFileList((info.fileList || []).slice(0, maxCount));
  };

  const handleRemove = (event, file) => {
    event.stopPropagation();

    if (disabled) return;

    onRemove(file);
  };

  const handlePreview = (event, file) => {
    event.stopPropagation();

    const src = file.url || previewUrls[file.uid] || file.thumbUrl;

    if (src) {
      window.open(src, "_blank", "noopener,noreferrer");
    }
  };

  // Chọn ảnh đại diện.
  const handleSetThumbnail = async (event, file) => {
    event.stopPropagation();

    if (disabled || settingKey != null || isThumbnail(file)) return;

    const key = getImageKey(file);
    const previousKey = selectedKey;

    // Đổi màu ngay để người dùng thấy ảnh vừa chọn.
    setSelectedKey(key);

    // Ảnh chưa lưu: báo cho component cha để xử lý sau khi upload.
    if (!file.id) {
      if (onSetThumbnail) {
        try {
          const result = await onSetThumbnail(file);

          if (result === false) {
            setSelectedKey(previousKey);
          }
        } catch {
          setSelectedKey(previousKey);
          message.error("Không thể chọn ảnh đại diện.");
        }
      } else {
        message.info("Ảnh sẽ được đặt làm đại diện sau khi lưu phòng.");
      }

      return;
    }

    // Ảnh đã lưu: gọi API đổi ảnh đại diện.
    if (!onSetThumbnail) {
      setSelectedKey(previousKey);
      message.warning("Chưa kết nối chức năng đổi ảnh đại diện.");
      return;
    }

    setSettingKey(key);

    try {
      const result = await onSetThumbnail(file);

      if (result === false) {
        setSelectedKey(previousKey);
      }
    } catch {
      setSelectedKey(previousKey);
      message.error("Không thể đổi ảnh đại diện.");
    } finally {
      setSettingKey(null);
    }
  };

  const uploadProps = {
    name: "file",
    accept: "image/*",
    multiple: true,
    maxCount,
    fileList,
    disabled,
    beforeUpload: () => false,
    onChange: handleChange,
    showUploadList: false,
  };

  return (
    <div className="ru">
      <div className="ru-head">
        <div>
          <h3 className="ru-title">Quản lý ảnh phòng</h3>
          <p className="ru-desc">
            Tải lên tối đa <b>{maxCount} ảnh</b>. Chọn ảnh đại diện bằng nút bên
            dưới mỗi ảnh.
          </p>
        </div>

        <div className="ru-count">
          <ProfileOutlined />
          <span>
            {fileList.length}/{maxCount} ảnh
          </span>
        </div>
      </div>

      <Upload {...uploadProps}>
        <Button
          type="dashed"
          className="ru-add"
          icon={<UploadOutlined />}
          disabled={disabled || fileList.length >= maxCount}
        >
          Thêm ảnh
        </Button>
      </Upload>

      {fileList.length > 0 && (
        <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
          {fileList.map((file, index) => {
            const src = file.url || previewUrls[file.uid] || file.thumbUrl;

            const active = isThumbnail(file);
            const key = getImageKey(file);
            const isSetting =
              settingKey != null && String(settingKey) === String(key);

            return (
              <Col key={file.uid} xs={12} sm={8} md={8} style={{ minWidth: 0 }}>
                <Card
                  className={`ru-card ${active ? "is-active" : ""}`}
                  styles={{ body: { padding: 0 } }}
                >
                  <div
                    className="ru-thumb"
                    onClick={(event) => handlePreview(event, file)}
                  >
                    {src ? (
                      <Image
                        src={src}
                        alt={file.name || `Ảnh phòng ${index + 1}`}
                        preview={false}
                        className="ru-img"
                      />
                    ) : (
                      <div className="ru-noimg">
                        <PiImage size={36} />
                      </div>
                    )}

                    <div
                      className="ru-tools"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Tooltip title="Xem ảnh">
                        <Button
                          shape="circle"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={(event) => handlePreview(event, file)}
                        />
                      </Tooltip>

                      <Tooltip title="Xóa ảnh">
                        <Button
                          danger
                          shape="circle"
                          size="small"
                          icon={<CloseOutlined />}
                          disabled={disabled}
                          onClick={(event) => handleRemove(event, file)}
                        />
                      </Tooltip>
                    </div>

                    {active && (
                      <span className="ru-badge">
                        <CheckCircleFilled />
                        Ảnh đại diện
                      </span>
                    )}
                  </div>

                  <div className="ru-foot">
                    <div
                      className="ru-name"
                      title={file.name || `Ảnh ${index + 1}`}
                    >
                      {file.name || `Ảnh ${index + 1}`}
                    </div>

                    <Button
                      block
                      size="small"
                      type={active ? "primary" : "default"}
                      className="ru-star"
                      icon={active ? <StarFilled /> : <StarOutlined />}
                      loading={isSetting}
                      disabled={disabled || active || settingKey != null}
                      onClick={(event) => handleSetThumbnail(event, file)}
                    >
                      {active ? "Ảnh đại diện" : "Đặt làm ảnh đại diện"}
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {fileList.length === 0 && (
        <div className="ru-empty">
          <PiImage />
          <p className="ru-empty__t">Chưa có ảnh phòng nào</p>
          <p className="ru-empty__s">
            Nhấn “Thêm ảnh” để tải ảnh minh họa phòng.
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomImageUpload;
