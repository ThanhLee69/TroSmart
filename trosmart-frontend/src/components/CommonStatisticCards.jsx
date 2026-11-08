import React from "react";
import { Row, Col, Card, Flex, Typography, Statistic } from "antd";
import "./CommonStatisticCards.css";

const { Text } = Typography;

const CommonStatisticCards = ({
  items = [],
  gutter = [16, 16],
  xs = 24,
  sm = 12,
  xl = 6,
}) => {
  return (
    <Row gutter={gutter}>
      {items.map((item) => (
        <Col xs={xs} sm={sm} xl={xl} key={item.key}>
          <Card
            variant="borderless"
            className="stat-card"
            styles={{
              body: {
                padding: 20,
              },
            }}
            style={{
              // Màu của từng thẻ, CSS dùng để phớt góc phải và đổ bóng khi rê chuột
              "--stat-color": item.color,
              height: "100%",
              borderTop: `3px solid ${item.color}`,
            }}
          >
            <Flex align="flex-start" justify="space-between" gap={12}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {item.title}
                </Text>

                <Statistic
                  value={item.value}
                  valueStyle={{
                    color: item.color,
                    fontSize: "clamp(24px, 2vw, 30px)",
                    fontWeight: 650,
                    marginTop: 6,
                  }}
                />
              </div>

              <Flex
                align="center"
                justify="center"
                className="stat-card__icon"
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 12,
                  background: item.background,
                  color: item.color,
                  fontSize: 21,
                }}
              >
                {item.icon}
              </Flex>
            </Flex>

            <Text
              type="secondary"
              style={{
                display: "block",
                marginTop: 10,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {item.description}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default CommonStatisticCards;
