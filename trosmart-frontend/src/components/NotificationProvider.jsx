import { notification } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

const ICONS = {
  success: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
  error: <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
  info: <InfoCircleOutlined style={{ color: "#1890ff" }} />,
  warning: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
};

export const useNotify = () => {
  const [api, contextHolder] = notification.useNotification();

  /**
   * @param {Object} options
   * @param {'success'|'error'|'info'|'warning'} options.type
   * @param {string} options.message
   * @param {string} options.description
   * @param {number} options.duration in seconds
   * @param {boolean} options.pauseOnHover
   */
  const notify = ({
    type = "error",
    message = "",
    description = "",
    duration = 3,
    pauseOnHover = true,
  }) => {
    api.open({
      message,
      description,
      icon: ICONS[type],
      duration,
      showProgress: true,
      pauseOnHover,
    });
  };

  return { notify, contextHolder };
};
