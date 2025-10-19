# NestJS Final Project

A complete NestJS application with TypeORM (PostgreSQL), Redis, JWT Authentication, and Swagger documentation.

## Features

- **NestJS Framework**: Modern Node.js framework for building scalable server-side applications
- **TypeORM**: Database ORM with PostgreSQL support
- **Redis**: Caching and session storage
- **JWT Authentication**: Simple access token-based authentication
- **Swagger**: API documentation and testing interface
- **Docker Compose**: Easy development environment setup

## Prerequisites

- Node.js (v16 or later)
- Docker and Docker Compose
- npm or yarn

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install dependencies
npm install
```

### 2. Start Database Services

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d
```

### 3. Set Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=nestjs_user
DATABASE_PASSWORD=nestjs_password
DATABASE_NAME=nestjs_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1000d

# App
PORT=3000
NODE_ENV=development
```

### 4. Start the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, you can access:

- **Swagger UI**: http://localhost:3000/api/docs
- **API Base URL**: http://localhost:3000

## API Endpoints

### Authentication

- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user (requires JWT token)
- `GET /auth/profile` - Get current user profile (requires JWT token)

### Users

- `POST /users` - Create new user
- `GET /users` - Get all users (requires JWT token)
- `GET /users/:id` - Get user by ID (requires JWT token)
- `PATCH /users/:id` - Update user (requires JWT token)
- `DELETE /users/:id` - Delete user (requires JWT token)
- `GET /users/stats` - Get user statistics (requires JWT token)

## Example Usage

### 1. Create a User

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "john_doe",
    "password": "password123"
  }'
```

### 3. Access Protected Endpoints

```bash
# Use the access_token from login response
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Database Schema

### User Entity

- `id`: Primary key
- `username`: Unique username
- `email`: Unique email address
- `password`: Hashed password
- `firstName`: User's first name
- `lastName`: User's last name
- `isActive`: Account status
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Redis Usage

The application uses Redis for:

- User data caching (1 hour TTL)
- User list caching (10 minutes TTL)
- User statistics caching (5 minutes TTL)
- Session tracking (24 hours TTL)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Run tests
npm run test

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

## Docker Services

The `docker-compose.yml` includes:

- **PostgreSQL**: Database server on port 5432
- **Redis**: Cache server on port 6379

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

## Project Structure

```
src/
├── auth/           # Authentication module
├── config/         # Configuration files
├── redis/          # Redis service
├── users/          # Users module
├── app.module.ts   # Root application module
└── main.ts         # Application entry point
```

## Environment Variables

All environment variables have default values, but you should create a `.env` file for customization:

- `DATABASE_*`: PostgreSQL connection settings
- `REDIS_*`: Redis connection settings
- `JWT_*`: JWT configuration
- `PORT`: Application port (default: 3000)
- `NODE_ENV`: Environment mode

## License

This project is licensed under the UNLICENSED License.
