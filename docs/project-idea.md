# Mini Food Delivery Backend

## 1. Project Overview

Mini Food Delivery Backend là hệ thống mô phỏng một ứng dụng đặt đồ ăn tương tự GrabFood hoặc ShopeeFood ở quy mô nhỏ.

Mục tiêu của project:

* Xây dựng backend theo hướng production-style.
* Thực hành thiết kế database và business logic thực tế.
* Xử lý transaction, cache và background jobs.
* Làm quen với các vấn đề thường gặp trong hệ thống backend.

---

# 2. Tech Stack

### Framework

* NestJS
* TypeScript

### Database

* PostgreSQL
* Prisma ORM

### Cache

* Redis

### Queue

* BullMQ

### Documentation

* Swagger

### Containerization

* Docker

---

# 3. Main Modules

## Authentication Module

Chức năng:

* Register
* Login
* Logout
* Refresh token

Người dùng:

* Customer
* Restaurant Owner
* Admin

---

## Restaurant Module

Restaurant Owner có thể:

* Tạo nhà hàng
* Cập nhật thông tin nhà hàng
* Đóng / mở cửa hàng
* Xem danh sách đơn hàng

Thông tin nhà hàng:

* name
* address
* description
* status

---

## Menu Module

Restaurant Owner có thể:

* Tạo món ăn
* Chỉnh sửa món ăn
* Xóa món ăn
* Cập nhật giá
* Cập nhật số lượng tồn kho

Thông tin món ăn:

* name
* description
* price
* stock
* imageUrl

---

## Cart Module

Customer có thể:

* Thêm món vào giỏ hàng
* Cập nhật số lượng
* Xóa món khỏi giỏ hàng

---

## Order Module

Customer có thể:

* Tạo đơn hàng
* Xem lịch sử đơn hàng
* Xem chi tiết đơn hàng

Order bao gồm:

* orderItems
* totalPrice
* couponDiscount
* finalPrice

---

## Coupon Module

Hỗ trợ:

* Coupon hết hạn
* Coupon chỉ dùng một lần
* Giá trị đơn hàng tối thiểu
* Giảm theo phần trăm hoặc số tiền cố định

Ví dụ:

SAVE10

* giảm 10%
* minimum order = 100.000đ
* hết hạn sau một ngày cụ thể

---

## Payment Module (Mock)

Không tích hợp cổng thanh toán thật.

Chỉ mô phỏng:

* Payment Success
* Payment Failed

---

# 4. Order Status Flow

```text
PENDING
↓
CONFIRMED
↓
PREPARING
↓
DELIVERING
↓
COMPLETED
```

Có thể:

```text
PENDING → CANCELLED
```

Không cho phép:

```text
COMPLETED → PREPARING
COMPLETED → CANCELLED
```

Mục tiêu:

* Thực hành State Machine đơn giản.
* Đảm bảo dữ liệu luôn hợp lệ.

---

# 5. Inventory Handling

Ví dụ:

Pizza stock = 1

Nếu hai người cùng đặt:

User A -> order
User B -> order

Hệ thống phải đảm bảo:

* Không bán vượt số lượng tồn kho.
* Stock không được âm.

Sử dụng:

* Database transaction.
* Kiểm tra tồn kho trước khi tạo order.

---

# 6. Cache Strategy

Redis cache:

* Restaurant list
* Menu list

Flow:

1. Check Redis.
2. Cache hit → trả dữ liệu.
3. Cache miss → query PostgreSQL.
4. Lưu lại Redis với TTL.

---

# 7. Background Jobs

Sau khi order thành công:

API sẽ enqueue job.

Worker xử lý:

* Send email notification.
* Log order.
* Analytics.

Mục tiêu:

* Không block API response.
* Giảm thời gian chờ của client.

---

# 8. Pagination

Ví dụ:

GET /restaurants?page=1&limit=20

GET /orders?page=2&limit=10

---

# 9. Search

Ví dụ:

GET /restaurants?keyword=pizza

GET /menu?keyword=burger

---

# 10. Soft Delete

Không xóa dữ liệu vật lý.

Sử dụng:

deletedAt

Mục tiêu:

* Khôi phục dữ liệu dễ dàng.
* Tránh mất dữ liệu ngoài ý muốn.

---

# 11. Statistics API

GET /stats

Trả về:

* totalOrders
* revenueToday
* topSellingItems

---

# 12. Error Handling

Ví dụ:

* Restaurant không tồn tại.
* Coupon hết hạn.
* Stock không đủ.
* User không có quyền thao tác.
* Order đã hoàn thành nên không thể chỉnh sửa.

---

# 13. Future Improvements

Có thể bổ sung:

* Rate limiting.
* Upload hình ảnh.
* Favorite restaurants.
* Review và rating.
* Notification service.
* Queue monitoring.
* Admin dashboard.

---

# 14. Entities

User

- id
- email
- password
- role

Restaurant

- id
- ownerId
- name
- address
- status

MenuItem

- id
- restaurantId
- name
- price
- stock

Cart

- id
- userId

Order

- id
- userId
- status
- totalPrice

OrderItem

- id
- orderId
- menuItemId
- quantity

Coupon

- id
- code
- type
- value
- expiredAt

---

# 15. Development Roadmap

Phase 1
- Project setup
- Prisma setup
- PostgreSQL setup

Phase 2
- Authentication

Phase 3
- Restaurant module

Phase 4
- Menu module

Phase 5
- Cart module

Phase 6
- Order module

Phase 7
- Coupon module

Phase 8
- Redis cache

Phase 9
- BullMQ worker

Phase 10
- Tests

Phase 11
- Docker + Deployment

---

# 16. Goal

Xây dựng một backend thực tế ở mức Intern nâng cao, tập trung vào:

* Business logic.
* Database design.
* Transaction.
* Cache.
* Background jobs.
* Clean architecture.