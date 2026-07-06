# Food Delivery Backend

A production-inspired RESTful backend for a food delivery platform, built with NestJS, Prisma, PostgreSQL, Redis and BullMQ.

![NestJS](https://img.shields.io/badge/NestJS-v11-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Redis](https://img.shields.io/badge/Redis-Cache-red)
![BullMQ](https://img.shields.io/badge/BullMQ-Queue-orange)
![Swagger](https://img.shields.io/badge/Swagger-API%20Docs-85EA2D)
![Docker](https://img.shields.io/badge/Docker-Container-2496ED)

---

## 📖 Project Overview

This project is a production-inspired backend for a food delivery platform similar to GrabFood or Uber Eats.

The goal of this project is to simulate how a real-world food delivery backend is designed, focusing on authentication, authorization, transactional order processing, coupon pricing, caching, background jobs, and maintainable software architecture.

The project follows a layered architecture with clear separation of responsibilities between controllers, services, infrastructure modules, and data access.

---

# ✨ Features

### Authentication

- User Registration
- User Login
- JWT Authentication
- Refresh Token Rotation
- Logout
- User Profile

### Restaurant Management

- Restaurant CRUD
- Owner Authorization
- Soft Delete

### Menu Management

- Menu CRUD
- Stock Management
- Availability Management

### Shopping Cart

- Add Item
- Update Quantity
- Remove Item
- Clear Cart
- Checkout

### Order Management

- Create Order
- Order Details
- Customer Order History
- Restaurant Order Management
- Order Status Workflow

### Coupon System

- Percentage Discount
- Fixed Amount Discount
- Minimum Order Validation
- Maximum Discount Validation
- Usage Limit
- Expiration Validation

### Payment System

- Mock Payment Flow
- Payment Confirmation
- Payment Status Tracking
- Payment History

### Dashboard

- Restaurant Dashboard
- Revenue Statistics
- Order Statistics
- Dashboard Cache

### Infrastructure

- Redis Cache
- BullMQ Background Jobs
- Swagger API Documentation
- Docker Development Environment
- Database Seed Scripts

---

# 🚀 Technical Highlights

This project demonstrates several backend engineering concepts commonly used in production systems:

- JWT Authentication with Refresh Token Rotation
- Role-Based Access Control (RBAC)
- Layered Architecture (Controller → Service → Database)
- Prisma ORM with PostgreSQL
- Database Transactions
- Snapshot Data for Order Consistency
- Coupon Pricing Engine
- Redis-based Dashboard Cache
- BullMQ Delayed Background Jobs
- Global Request Validation
- RESTful API Design
- Swagger API Documentation
- Dockerized Local Development
- Database Seed Scripts

---

# 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | NestJS 11 |
| Language | TypeScript |
| ORM | Prisma ORM |
| Database | PostgreSQL 16 |
| Authentication | JWT + Passport |
| Validation | class-validator + class-transformer |
| Cache | Redis |
| Queue | BullMQ |
| API Documentation | Swagger (OpenAPI) |
| Containerization | Docker |
| Password Hashing | bcrypt |

---

# 🏛️ Architecture

The project follows a layered architecture where each layer has a clear responsibility.

```text
                    Client
                       │
                       ▼
               REST API (Controller)
                       │
                       ▼
                Business Services
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   Pricing Service   Redis Cache    BullMQ Queue
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                Prisma ORM
                       │
                       ▼
                 PostgreSQL
```

### Architecture Principles

- Controllers only handle HTTP requests and responses.
- Business logic is implemented inside Services.
- Prisma is responsible for data access.
- Redis is used for caching dashboard data.
- BullMQ handles delayed payment timeout jobs and asynchronous background processing.
- Database transactions guarantee data consistency during checkout and order creation.

---

# 📂 Project Structure

```text
src
├── auth            # Authentication & Authorization
├── restaurant      # Restaurant Management
├── menu-item       # Menu Management
├── cart            # Shopping Cart
├── order           # Order Management
├── coupon          # Coupon Management
├── pricing         # Pricing & Discount Engine
├── payment         # Mock Payment
├── dashboard       # Restaurant Dashboard
├── cache           # Redis Cache Services
├── redis           # Redis Infrastructure
├── queue           # BullMQ Background Jobs
├── prisma          # Prisma Service
├── common          # Shared DTOs & Utilities
└── user            # User Services
```

The project is organized using feature-based modules to keep business logic isolated and maintainable.

---

# 🗄️ Database Design

The system consists of the following main entities:

- User
- Restaurant
- MenuItem
- Cart
- CartItem
- Order
- OrderItem
- Coupon
- Payment

### Entity Relationship Diagram

```mermaid
erDiagram

USER ||--o{ RESTAURANT : owns
USER ||--o{ ORDER : places
USER ||--o{ COUPON : creates
USER ||--|| CART : has

RESTAURANT ||--o{ MENU_ITEM : contains
RESTAURANT ||--o{ ORDER : receives

CART ||--o{ CART_ITEM : contains
MENU_ITEM ||--o{ CART_ITEM : referenced_by

ORDER ||--|{ ORDER_ITEM : contains
MENU_ITEM ||--o{ ORDER_ITEM : snapshot_of

ORDER ||--|| PAYMENT : has
```

The database design focuses on maintaining data consistency through foreign key relationships, transactional order creation, and snapshot data for historical accuracy.

---

# 🚀 Getting Started

## Prerequisites

Before running the project, make sure you have installed:

- Node.js 22+
- Docker Desktop
- PostgreSQL (optional if using Docker)
- Redis (optional if using Docker)
- Git

---

## Clone Repository

```bash
git clone https://github.com/<your-github-username>/food-delivery-backend.git

cd food-delivery-backend
```

---

## Install Dependencies

```bash
npm install
```

---

# 🐳 Docker

The project provides a Docker Compose configuration for local development.

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

Check running containers:

```bash
docker ps
```

Expected services:

- PostgreSQL
- Redis

Stop containers:

```bash
docker compose down
```

---

# ⚙️ Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/food_delivery_db"

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

PORT=3000

REDIS_HOST=localhost
REDIS_PORT=6379
```

---

# 🗃️ Database Setup

Generate Prisma Client:

```bash
npx prisma generate
```

Run database migrations:

```bash
npx prisma migrate deploy
```

> During development, you can also use:

```bash
npx prisma migrate dev
```

---

# 🌱 Seed Database

Populate the database with demo data:

```bash
npx prisma db seed
```

The seed script creates:

- Demo Users
- Restaurants
- Menu Items
- Coupons

---

# ▶️ Run Application

Development mode:

```bash
npm run start:dev
```

Production build:

```bash
npm run build

npm run start:prod
```

The application will start at:

```text
http://localhost:3000
```

Swagger API documentation:

```text
http://localhost:3000/api
```

---

---

# 👤 Demo Accounts

The database seed provides three demo accounts for testing different roles.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | 123456 |
| Restaurant Owner | owner@example.com | 123456 |
| Customer | customer@example.com | 123456 |

---

# 📖 API Documentation

Interactive API documentation is available via Swagger UI.

After starting the application, open:

```text
http://localhost:3000/api
```

Swagger includes:

- Request validation
- Authentication support (Bearer Token)
- DTO schemas
- Example request bodies
- Endpoint descriptions

---

# 🔄 Business Workflow

## Authentication

```text
Register
    ↓
Login
    ↓
Access Token + Refresh Token
    ↓
Authenticated Requests
    ↓
Refresh Token Rotation
    ↓
Logout
```

---

## Customer Ordering Flow

```text
Browse Restaurants
        ↓
Browse Menu Items
        ↓
Add Items to Cart
        ↓
Checkout
        ↓
Apply Coupon (Optional)
        ↓
Pricing Calculation
        ↓
Database Transaction
        ↓
Create Order
        ↓
Create Payment
        ↓
Confirm Payment
```

---

## Order Processing Flow

```text
Customer Creates Order
            ↓
Order Status = PENDING
            ↓
Restaurant Confirms Order
            ↓
PREPARING
            ↓
DELIVERING
            ↓
COMPLETED
```

---

## Payment Flow

```text
Create Payment
       ↓
Status = PENDING
       ↓
Mock Payment Confirmation
       ↓
SUCCESS / FAILED
       ↓
Update Payment Status
       ↓
Invalidate Dashboard Cache
```

---

## Background Job Flow

```text
Payment Created
       ↓
BullMQ Queue
       ↓
Delayed Job
       ↓
Payment Timeout Processing
```

---

# 📌 Current Project Status

Implemented features:

- ✅ Authentication & Authorization
- ✅ Restaurant Management
- ✅ Menu Management
- ✅ Shopping Cart
- ✅ Order Processing
- ✅ Coupon System
- ✅ Pricing Engine
- ✅ Payment System
- ✅ Dashboard Statistics
- ✅ Redis Cache
- ✅ BullMQ Queue
- ✅ Swagger Documentation
- ✅ Docker Environment
- ✅ Database Seed

---

# 🔮 Future Improvements

Although the current implementation already covers the core business logic of a food delivery platform, there are several features that could be added in the future.

### Customer Features

- Food Reviews & Ratings
- Favorite Restaurants
- Wishlist
- Delivery Address Management
- Order Tracking

### Restaurant Features

- Restaurant Operating Hours
- Menu Categories
- Sales Analytics
- Inventory Alerts

### Payment

- Stripe Integration
- VNPay Integration
- MoMo Integration
- Refund Processing

### Infrastructure

- CI/CD Pipeline
- GitHub Actions
- Docker Compose for Production
- Centralized Logging
- Monitoring & Metrics
- Rate Limiting
- API Versioning

---

# 👨‍💻 Author

Developed as a portfolio project to demonstrate modern backend development practices using NestJS and the Node.js ecosystem.

If you find this project useful, feel free to explore the source code and provide feedback.

---

# 📄 License

This project is intended for educational and portfolio purposes.