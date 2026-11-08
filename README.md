# TroSmart – Hệ thống quản lý nhà trọ thông minh

**TroSmart** là hệ thống quản lý nhà trọ được xây dựng nhằm hỗ trợ chủ nhà trọ quản lý tập trung các tòa nhà, phòng cho thuê, khách thuê, hợp đồng, hóa đơn và các dịch vụ liên quan. Hệ thống giúp đơn giản hóa quy trình quản lý, theo dõi tình trạng phòng và nâng cao hiệu quả vận hành nhà trọ.

## 1. Công nghệ sử dụng

### Frontend
- React 18
- Ant Design 5
- React Router DOM 6
- Axios
- JavaScript (JSX)

### Backend
- Java 17
- Spring Boot 3.2.6
- Spring Security 6
- Spring Data JPA / Hibernate
- MapStruct
- Lombok
- JWT Authentication
- Redis

### Database và công cụ
- MySQL
- Redis
- Maven
- Git / GitHub
- Docker
- Postman
- Swagger / OpenAPI

## 2. Chức năng chính

- **Quản lý tòa nhà:** Thêm, sửa, xóa và quản lý thông tin các tòa nhà.
- **Quản lý phòng:** Quản lý danh sách phòng, loại phòng, diện tích, giá thuê, tiện nghi và hình ảnh phòng.
- **Quản lý khách thuê:** Lưu trữ thông tin khách thuê và phương tiện đăng ký.
- **Quản lý hợp đồng:** Tạo, cập nhật, gia hạn và kết thúc hợp đồng thuê phòng.
- **Quản lý điện nước và dịch vụ:** Theo dõi chỉ số điện, nước và các khoản phí dịch vụ.
- **Quản lý hóa đơn:** Tự động tổng hợp chi phí và quản lý thanh toán.
- **Quản lý sự cố:** Tiếp nhận và theo dõi các yêu cầu sửa chữa.
- **Thông báo:** Hỗ trợ gửi thông báo đến khách thuê.
- **Dashboard:** Tổng quan tình hình hoạt động, số lượng phòng và doanh thu.
- **Tìm kiếm phòng:** Hỗ trợ người thuê tìm kiếm phòng theo khu vực và các tiêu chí phù hợp.

## 3. Cấu trúc dự án

```text
TroSmart/
├── trosmart-backend/       # Spring Boot REST API
│   ├── src/
│   ├── pom.xml
│   └── Dockerfile
│
├── trosmart-frontend/      # ReactJS Application
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── compose.yaml
├── docker-compose.dev.yml
└── README.md
```

## 4. Cài đặt và chạy dự án

### Yêu cầu môi trường

- JDK 17
- Node.js và npm
- MySQL
- Redis
- Maven (có thể sử dụng Maven Wrapper đi kèm Backend)

### 4.1. Backend

Di chuyển vào thư mục Backend:

```bash
cd trosmart-backend
```

Chạy ứng dụng:

```bash
./mvnw spring-boot:run
```

Trên Windows:

```bash
mvnw.cmd spring-boot:run
```

Backend mặc định chạy tại:

```text
http://localhost:8080
```

API base URL:

```text
http://localhost:8080/api/v1
```

### 4.2. Frontend

Mở terminal khác và di chuyển vào thư mục Frontend:

```bash
cd trosmart-frontend
```

Cài đặt các thư viện:

```bash
npm install
```

Chạy ứng dụng:

```bash
npm start
```

Frontend mặc định chạy tại:

```text
http://localhost:3000
```

### 4.3. Cấu hình môi trường

Cấu hình các thông tin cần thiết trong file môi trường `.env`, bao gồm:

- Thông tin kết nối MySQL.
- Thông tin kết nối Redis.
- JWT secret.
- Cloudinary credentials (nếu sử dụng chức năng lưu trữ hình ảnh).

**Lưu ý:** Không đưa file `.env` hoặc thông tin tài khoản, mật khẩu và khóa bí mật lên GitHub.

## 5. Tài liệu API

Backend sử dụng Swagger / OpenAPI để hỗ trợ kiểm tra và thử nghiệm các API.

Sau khi khởi động Backend, truy cập:

```text
http://localhost:8080/swagger-ui/index.html
```

## 6. Định hướng phát triển

TroSmart được phát triển theo mô hình Frontend – Backend tách biệt, sử dụng RESTful API để trao đổi dữ liệu. Dự án hướng đến việc xây dựng một nền tảng quản lý nhà trọ tập trung, dễ sử dụng và có khả năng mở rộng thêm các chức năng trong tương lai.

---

**TroSmart** – Smart Boarding House Management System.
