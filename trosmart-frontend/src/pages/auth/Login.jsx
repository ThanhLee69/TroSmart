import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Checkbox,
  Typography,
  Card,
  Row,
  Col,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginAPI } from "../../api/authApi";
import { useNotify } from "../../components/NotificationProvider";
import { getHomePath } from "../../context/PermissionContext";
import "./LoginPage.css";

const { Title, Text } = Typography;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { notify, contextHolder } = useNotify();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);

      const data = await loginAPI({
        username: values.username,
        password: values.password,
      });

      login(data.userInfo, data.accessToken, data.refreshToken);

      navigate(getHomePath(data.userInfo?.role), { replace: true });
    } catch (error) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        notify({
          type: "error",
          message: "Đăng nhập thất bại",
          description: "Tên đăng nhập hoặc mật khẩu không chính xác!",
        });
      } else {
        notify({
          type: "error",
          message: "Đăng nhập thất bại",
          description:
            error.response?.data?.message ||
            "Đã xảy ra lỗi. Vui lòng thử lại sau!",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {contextHolder}

      <Card className="login-card" styles={{ body: { padding: 0 } }}>
        <Row className="login-row">
          {/* ==================== IMAGE ==================== */}
          <Col xs={0} sm={0} md={12} className="login-image">
            <div className="login-image-overlay" />

            <div className="login-image-content">
              <Title level={4} style={{ color: "#fff", marginBottom: 8 }}>
                Chào mừng đến với TroSmart
              </Title>

              <Text style={{ color: "#ddd", fontSize: 14 }}>
                Hệ thống quản lý nhà trọ thông minh, an toàn và tiện lợi
              </Text>
            </div>
          </Col>

          {/* ==================== FORM ==================== */}
          <Col xs={24} sm={24} md={12} className="login-form-wrapper">
            <div className="login-form-container">
              <div className="login-header">
                <Title level={2} className="login-title">
                  Đăng nhập
                </Title>

                <Text type="secondary">Vui lòng đăng nhập để tiếp tục</Text>
              </div>

              <Form
                layout="vertical"
                onFinish={onFinish}
                className="login-form"
              >
                <Form.Item
                  label="Tên đăng nhập"
                  name="username"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập tên đăng nhập",
                    },
                  ]}
                >
                  <Input size="large" placeholder="Nhập tên đăng nhập" />
                </Form.Item>

                <Form.Item
                  label="Mật khẩu"
                  name="password"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập mật khẩu",
                    },
                  ]}
                >
                  <Input.Password size="large" placeholder="Nhập mật khẩu" />
                </Form.Item>

                <Row
                  justify="space-between"
                  align="middle"
                  className="login-options"
                >
                  <Checkbox>Ghi nhớ đăng nhập</Checkbox>

                  <a href="#" onClick={(e) => e.preventDefault()}>
                    Quên mật khẩu?
                  </a>
                </Row>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                  className="login-button"
                >
                  Đăng nhập
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
