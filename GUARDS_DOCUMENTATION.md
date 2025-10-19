# 🛡️ Guards Documentation - Role-Based API Security

This document explains how guards work in the NFT marketplace API and how they control access to different endpoints.

## What are Guards?

Guards are classes that determine whether a request should be handled by a route handler or not. They implement access control logic and run **before** the route handler executes.

## Guard Types in Our System

### 1. **Authentication Guard (JwtAuthGuard)**

**Purpose:** Verifies that the user has a valid JWT token

```typescript
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Get('protected-endpoint')
async protectedRoute() {
  // Only authenticated users can access this
}
```

**What it does:**

- Validates JWT token from Authorization header
- Extracts user info and adds it to request object
- Blocks access if token is invalid/missing

### 2. **Role-Based Guard (RolesGuard)**

**Purpose:** Checks if user has specific roles

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('admin-only')
async adminRoute() {
  // Only admins can access this
}
```

**What it does:**

- Checks user's role against required roles
- Allows access if user has ANY of the required roles
- Blocks access if user doesn't have required role

### 3. **Admin-Only Guard (AdminGuard)**

**Purpose:** Simple admin-only access

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Delete('dangerous-action')
async adminAction() {
  // Only admins can perform this action
}
```

**What it does:**

- Checks if user.role === UserRole.ADMIN
- Simpler than RolesGuard for admin-only routes

### 4. **Owner or Admin Guard (OwnerOrAdminGuard)**

**Purpose:** Allows resource owners or admins

```typescript
@UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
@Patch('users/:id')
async updateUser(@Param('id') id: number) {
  // Users can only update their own profile, admins can update anyone
}
```

**What it does:**

- Allows admins to access everything
- Allows users to access only their own resources
- Determines ownership from URL params, request body, or other context

## API Endpoint Security Levels

### 🟢 **Public Endpoints** (No guards)

```typescript
@Post('auth/login')          // Anyone can login
@Post('users')               // Anyone can register
@Get('nft')                  // Anyone can view NFTs
@Get('nft/for-sale')         // Anyone can see NFTs for sale
```

### 🟡 **Authenticated Endpoints** (JwtAuthGuard only)

```typescript
@UseGuards(JwtAuthGuard)
@Get('auth/profile')         // Any authenticated user
@Post('nft')                 // Any authenticated user can create NFT
@Get('nft/my-nfts')          // Any authenticated user (shows their own)
@Post('upload/presigned-url') // Any authenticated user can upload
```

### 🟠 **Owner/Admin Endpoints** (JwtAuthGuard + OwnerOrAdminGuard)

```typescript
@UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
@Patch('users/:id')          // Users can edit their own profile, admins can edit anyone
@Patch('nft/:id')            // NFT owners can edit their NFT, admins can edit any
@Delete('nft/:id')           // NFT owners can delete their NFT, admins can delete any
```

### 🔴 **Admin-Only Endpoints** (JwtAuthGuard + AdminGuard/RolesGuard)

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Get('users')                // Only admins can see all users
@Delete('users/:id')         // Only admins can delete users
@Get('admin/stats')          // Only admins can see system stats

// Alternative syntax using @Roles decorator
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('admin/advanced-stats')
```

## Guard Execution Order

Guards are executed in the order they're listed:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, OwnerOrAdminGuard)
```

1. **JwtAuthGuard** - Validates token, adds user to request
2. **RolesGuard** - Checks user roles
3. **OwnerOrAdminGuard** - Checks ownership or admin status

If any guard fails, the request is blocked and subsequent guards don't execute.

## Real-World Examples

### Example 1: NFT Management

```typescript
@Controller("nft")
export class NFTController {
  // ✅ Anyone can view NFTs
  @Get()
  async findAll() {}

  // 🟡 Authenticated users can create NFTs
  @Post()
  @UseGuards(JwtAuthGuard)
  async create() {}

  // 🟠 Only NFT owner or admin can update
  @Patch(":id")
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async update() {}

  // 🔴 Only admin can force delete any NFT
  @Delete("admin/:id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async adminDelete() {}
}
```

### Example 2: User Management

```typescript
@Controller("users")
export class UsersController {
  // ✅ Anyone can register
  @Post()
  async create() {}

  // 🔴 Only admins can see all users
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {}

  // 🟡 Anyone authenticated can view user profile
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async findOne() {}

  // 🟠 Users can update their own profile, admins can update anyone
  @Patch(":id")
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  async update() {}
}
```

### Example 3: Admin Panel

```typescript
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard) // Apply to ALL routes
export class AdminController {
  // All routes here require admin access

  @Get("users")
  async getAllUsers() {}

  @Get("stats")
  async getSystemStats() {}

  @Delete("users/:id")
  async deleteUser() {}
}
```

## Error Responses

When guards block access, they return these HTTP responses:

### 401 Unauthorized (JwtAuthGuard fails)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (Role/Admin/Owner guards fail)

```json
{
  "statusCode": 403,
  "message": "Access denied. Required roles: admin. Your role: user"
}
```

```json
{
  "statusCode": 403,
  "message": "You can only access your own resources"
}
```

## Testing Guards

### Test with different user roles:

```bash
# 1. Login as regular user
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890abcdef1234567890abcdef12345678"}'

# 2. Try admin endpoint (should fail)
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer USER_TOKEN"
# Response: 403 Forbidden

# 3. Create admin user (manually in database)
# Update user role to 'admin' in database

# 4. Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"ADMIN_WALLET_ADDRESS"}'

# 5. Try admin endpoint (should succeed)
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Response: List of all users
```

## Best Practices

### 1. **Always use JwtAuthGuard first**

```typescript
// ✅ Good
@UseGuards(JwtAuthGuard, AdminGuard)

// ❌ Bad - AdminGuard won't have user info
@UseGuards(AdminGuard)
```

### 2. **Layer guards appropriately**

```typescript
// ✅ Good - Progressive security
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)

// ✅ Good - Multiple checks
@UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
```

### 3. **Use controller-level guards for consistent security**

```typescript
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard) // All routes require admin
export class AdminController {
  // All methods inherit these guards
}
```

### 4. **Document security requirements in Swagger**

```typescript
@ApiResponse({ status: 403, description: "Forbidden - Admin access required" })
@UseGuards(JwtAuthGuard, AdminGuard)
async adminAction() { }
```

## Guard Implementation Details

Guards have access to:

- **ExecutionContext** - Information about the current request
- **Request object** - Including user info added by JWT strategy
- **Route metadata** - Including @Roles decorator values

They return:

- **true** - Allow access to route
- **false** - Block access (throws ForbiddenException)
- **Exception** - Custom error response

This security system ensures that:

- 🔐 Only authenticated users can access protected resources
- 👑 Only admins can perform administrative actions
- 🏠 Users can only modify their own resources (unless they're admin)
- 📝 All access attempts are properly validated and logged
