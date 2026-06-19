# 🚚 HustGo - Hệ quản lý mạng lưới giao hàng chặng cuối thời gian thực phạm vi thành phố Hà Nội

## 🌐 Giới thiệu

HustGo là hệ thống giao vận đa nền tảng, thời gian thực, tối ưu hóa mạng lưới giao hàng cuối mile (last-mile delivery). Hệ thống kết nối khách hàng, shipper, quản trị bưu cục và quản trị hệ thống trong một hệ sinh thái logistics hiện đại được triển khai hoàn toàn trên nền tảng Kubernetes.

## 🚀 Tính năng

| Vai trò | Chức năng |
|--------|-----------|
| **Khách hàng** | - Xem thống kê chi tiêu<br>- Tạo đơn hàng <br>- Theo dõi đơn hàng real-time<br>- Xem lịch sử đơn hàng<br>- Thanh toán trực tuyến (MoMo)<br>- Đánh giá sau khi nhận hàng<br>- Tương tác với Chatbot |
| **Shipper** | - Xem thống kê doanh thu<br>- Nhận tuyến giao hàng tự động<br>- Cập nhật vị trí real-time<br>- Cập nhật trạng thái giao hàng<br>- Thu tiền COD (nếu có)<br>- Xem lịch sử giao hàng<br>- Tương tác với Chatbot |
| **Hub Admin** | - Xem báo cáo thống kê bưu cục<br>- Xác nhận nhận đơn / nhập kho trung chuyển<br>- Tạo tuyến trung chuyển<br>- Tạo tuyến giao hàng<br>- Gán tuyến cho shipper<br>- Quản lý đơn hàng chờ giao<br>- Tương tác với Chatbot |
| **Admin** | - Xem báo cáo tổng quan hệ thống<br>- Quản lý người dùng<br>- Quản lý bưu cục<br>- Quản lý phản hồi<br>- Tương tác với Chatbot |

## 🛠️ Tech Stack

| **Thành phần** | **Công nghệ** |
|---------------|----------------|
| **Frontend** | React.js, Vite, Tailwind CSS |
| **Backend** | Java Spring Boot, Spring Cloud |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Message Broker** | Apache Kafka |
| **Routing Engine** | OSRM (Open Source Routing Machine) |
| **Authentication** | Spring Security, JWT, OAuth2 (Google, Facebook) |
| **Chatbot** | Spring AI, Gemini API |
| **Service Discovery** | Netflix Eureka |
| **API Gateway** | Spring Cloud Gateway |
| **Resilience** | Resilience4j (Circuit Breaker, Retry) |
| **Distributed Tracing** | Micrometer, Zipkin |
| **Real-time Comm.** | WebSocket, STOMP |
| **Storage** | Cloudinary (Image/Video CDN) |
| **Containerization** | Docker, Docker Compose |
| **Deployment & Orchestration** | Google Kubernetes Engine (GKE), Nginx Ingress, Helm |

## 📁 Cấu trúc

```plaintext
HustGo/
├── backend/                    # Mã nguồn các Microservices (Spring Boot)
│   ├── api-gateway/            # API Gateway
│   ├── auth-service/           # Xác thực & Phân quyền (OAuth2/JWT)
│   ├── order-service/          # Quản lý đơn hàng
│   ├── routing-service/        # Tối ưu hóa tuyến đường (gọi OSRM)
│   ├── payment-service/        # Xử lý thanh toán (MoMo)
│   ├── notification-service/   # Thông báo Real-time (Websocket)
│   ├── tracking-service/       # Theo dõi vị trí Live
│   ├── hub-service/            # Quản lý trạm bưu cục
│   ├── chatbot-service/        # AI Chatbot (Spring AI + Gemini)
│   ├── service-registry/       # Netflix Eureka
│   ├── config-server/          # Cấu hình tập trung (Spring Cloud Config)
│   ├── base-domains/           # Shared DTOs và Models dùng chung
│   └── .dockerignore           # Cấu hình ignore cho Docker build
├── frontend/                   # Ứng dụng React + Vite
│   └── src/                    # Components, Pages, Services, Context...
├── k8s/                        # Cấu hình triển khai Kubernetes (YAML)
└── README.md
```

## ⚙️ Cài đặt

### I. Yêu cầu hệ thống

- Java 17+
- Node.js 18+
- Docker & Docker Compose
- Maven 3.8+

### II. Chạy Hạ tầng cơ sở (Infrastructure)

Chạy các dịch vụ phụ trợ như Database, Cache, Message Broker thông qua Docker Compose:

```bash
cd backend
docker-compose up -d
```

Các Container khởi động:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Kafka (port 9092)
- OSRM (port 5000)
- Zipkin (port 9411)

### III. Chạy Backend (Microservices)

```bash
# Build toàn bộ các services 
mvn clean package -DskipTests

# Chạy từng service bằng lệnh (ví dụ với order-service)
cd backend/order-service
mvn spring-boot:run
```

**Thứ tự khởi động bắt buộc:**
1. `service-registry` (Eureka) - port 8761
2. `config-server` - port 8888
3. `api-gateway` - port 8080
4. `auth-service` - port 8081
5. Các service còn lại

### IV. Chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend sẽ chạy tại địa chỉ: `http://localhost:5173`

## 🏗️ Kiến trúc Hệ thống

```plaintext
                              Khách hàng / Shipper
                                       │
                                (hustgo.id.vn)
                                       │
                        ┌──────────────▼─────────────┐
                        │   GCP Cloud Load Balancer  │  
                        └──────────────┬─────────────┘
                                       │
                        ┌──────────────▼─────────────┐
                        │   Nginx Ingress Controller │  
                        └─────────┬────────────┬─────┘
                     (/api/*)     │            │  (/*)
              ┌───────────────────▼─┐        ┌─▼───────────────────┐
              │     API Gateway     │        │      Frontend       │
              │ (Spring Boot - 8080)│        │   (React/Nginx - 80)│
              └─────────┬───────────┘        └─────────────────────┘
                        │
    ┌───────┬───────┬───┴───┬───────┬───────┬───────┬───────┐
    │       │       │       │       │       │       │       │
┌───▼───┐ ┌─▼───┐ ┌─▼───┐ ┌─▼───┐ ┌─▼───┐ ┌─▼───┐ ┌─▼───┐ ┌─▼───┐
│ Auth  │ │Order│ │ Pay │ │ Hub │ │Route│ │Chat │ │Notif│ │Track│
└───┬───┘ └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘ └─┬───┘
    │       │       │       │       │       │       │       │
    │   ┌───┴───────┴───────┴───────┴───────┴───────┴───────┤
    │   │                                                   │
  ┌─▼───▼────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────▼────┐
  │PostgreSQL│ │  Redis   │ │  Kafka   │ │   OSRM   │ │Websocket │
  │ (DB Core)│ │ (Cache)  │ │ (Broker) │ │ (Bản đồ) │ │ (STOMP)  │
  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

┌──────────────────────────────────────────────────────────────┐
│                  HẠ TẦNG QUẢN LÝ (Internal)                  │
├──────────────────────────────┬───────────────────────────────┤
│  Service Registry (Eureka)   │ Config Server (Spring Config) │
│  (Phát hiện & gọi dịch vụ)   │  (Cấu hình tập trung từ Git)  │
└──────────────────────────────┴───────────────────────────────┘
```

## 🔐 Authentication

- **OAuth2**: Đăng nhập nhanh qua Google, Facebook.
- **JWT**: Token xác thực phiên làm việc người dùng.
- **Redis**: Chứa danh sách Token bị thu hồi (Blacklist) để xử lý Logout an toàn.

## 🔌 Real-time

- **WebSocket (STOMP)**: Xử lý thông báo đẩy.
- **Kafka**: Điều phối bản tin thời gian thực giữa các service.
- **Shipper Location**: Theo dõi vị trí tài xế theo thời gian thực.

## 🤖 AI Chatbot

- **Spring AI**: Khung làm việc tích hợp AI vào Java.
- **Gemini API**: Sử dụng LLM của Google.
- **Use case**: Trả lời tự động, hỗ trợ tra cứu thông tin đơn hàng thông minh.

## 📚 Tài liệu tham khảo

- [Spring Boot](https://spring.io/projects/spring-boot)
- [Spring Cloud](https://spring.io/projects/spring-cloud)
- [Kubernetes](https://kubernetes.io/docs/home/)
- [React](https://react.dev/)
- [OSRM](http://project-osrm.org/)
- [Kafka](https://kafka.apache.org/)
- [Redis](https://redis.io/docs/)
- [OAuth 2.0](https://oauth.net/2/)
- [JSON Web Tokens (JWT)](https://jwt.io/)
- [Google Cloud GKE](https://cloud.google.com/kubernetes-engine/docs)

---

Mọi đóng góp và thắc mắc xin liên hệ:

- ☎ _: (+84) 904 262 833_
- ✉ _: nam.nh225213@sis.hust.edu.vn_