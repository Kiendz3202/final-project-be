# 🛡️ Guard Usage Examples - Quick Reference

## Guard Combinations by Security Level

### 🟢 Public Access (No Guards)

```typescript
// Anyone can access
@Get('nft')                    // View all NFTs
@Get('nft/for-sale')           // View NFTs for sale
@Post('auth/login')            // Login
@Post('users')                 // Register new user
```

### 🟡 Authenticated Only

```typescript
@UseGuards(JwtAuthGuard)
@Get('auth/profile')           // Get own profile
@Get('nft/my-nfts')           // Get own NFTs
@Post('nft')                   // Create NFT
@Post('upload/presigned-url')  // Generate upload URL
```

### 🟠 Owner or Admin

```typescript
@UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
@Patch('users/:id')           // Update user (own profile or admin)
@Patch('nft/:id')             // Update NFT (owner or admin)
@Delete('nft/:id')            // Delete NFT (owner or admin)
```

### 🔴 Admin Only

```typescript
// Method 1: Using AdminGuard
@UseGuards(JwtAuthGuard, AdminGuard)
@Get('users')                 // View all users
@Delete('users/:id')          // Delete any user
@Get('admin/stats')           // System statistics

// Method 2: Using RolesGuard + @Roles decorator
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Get('admin/advanced-stats')  // Advanced statistics
```

## Complete API Endpoint Security Map

```
📁 NFT Marketplace API Security

├── 🟢 PUBLIC (No Authentication)
│   ├── POST /auth/login
│   ├── POST /users (register)
│   ├── GET /nft (view all)
│   └── GET /nft/for-sale
│
├── 🟡 AUTHENTICATED (JWT Required)
│   ├── GET /auth/profile
│   ├── POST /auth/logout
│   ├── GET /nft/my-nfts
│   ├── POST /nft (create)
│   ├── GET /nft/:id
│   └── POST /upload/presigned-url
│
├── 🟠 OWNER OR ADMIN (Resource Access Control)
│   ├── PATCH /users/:id (own profile)
│   ├── PATCH /nft/:id (own NFT)
│   └── DELETE /nft/:id (own NFT)
│
└── 🔴 ADMIN ONLY (Admin Privileges)
    ├── GET /users (all users)
    ├── DELETE /users/:id
    ├── GET /admin/users
    ├── GET /admin/nfts
    ├── GET /admin/stats
    ├── PATCH /admin/users/:id/role
    └── DELETE /admin/nfts/:id
```

## Guard Implementation Examples

### Example 1: NFT Controller

```typescript
@Controller("nft")
export class NFTController {
  // 🟢 Public - Anyone can view
  @Get()
  async findAll() {
    return this.nftService.findAll();
  }

  // 🟢 Public - Anyone can view for-sale items
  @Get("for-sale")
  async findForSale() {
    return this.nftService.findForSale();
  }

  // 🟡 Authenticated - Any user can create
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(@Body() createNFTDto: CreateNFTDto, @Request() req) {
    return this.nftService.create(createNFTDto, req.user.id);
  }

  // 🟡 Authenticated - Users see their own NFTs
  @Get("my-nfts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findMyNFTs(@Request() req) {
    return this.nftService.findByOwner(req.user.id);
  }

  // 🟠 Owner or Admin - Only owner or admin can update
  @Patch(":id")
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @ApiBearerAuth()
  async update(
    @Param("id") id: number,
    @Body() updateNFTDto: UpdateNFTDto,
    @Request() req
  ) {
    return this.nftService.update(id, updateNFTDto, req.user.id);
  }

  // 🟠 Owner or Admin - Only owner or admin can delete
  @Delete(":id")
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @ApiBearerAuth()
  async remove(@Param("id") id: number, @Request() req) {
    await this.nftService.remove(id, req.user.id);
    return { message: "NFT deleted successfully" };
  }
}
```

### Example 2: User Controller with Mixed Security

```typescript
@Controller("users")
export class UsersController {
  // 🟢 Public - Anyone can register
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // 🔴 Admin Only - View all users
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async findAll() {
    return this.usersService.findAll();
  }

  // 🟡 Authenticated - Anyone can view user profiles
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findOne(@Param("id") id: number) {
    return this.usersService.findOne(id);
  }

  // 🟠 Owner or Admin - Users can update own profile, admins can update anyone
  @Patch(":id")
  @UseGuards(JwtAuthGuard, OwnerOrAdminGuard)
  @ApiBearerAuth()
  async update(@Param("id") id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  // 🔴 Admin Only - Only admins can delete users
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async remove(@Param("id") id: number) {
    await this.usersService.remove(id);
    return { message: "User deleted successfully" };
  }
}
```

### Example 3: Admin Controller (All routes protected)

```typescript
@Controller("admin")
@UseGuards(JwtAuthGuard, AdminGuard) // Apply to ALL routes
@ApiBearerAuth()
export class AdminController {
  // 🔴 All routes here are admin-only by default

  @Get("users")
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Get("stats")
  async getSystemStats() {
    // Return system statistics
  }

  @Patch("users/:id/role")
  async updateUserRole(
    @Param("id") id: number,
    @Body() updateData: { role: UserRole }
  ) {
    return this.usersService.update(id, { role: updateData.role });
  }

  @Delete("users/:id")
  async deleteUser(@Param("id") id: number) {
    await this.usersService.remove(id);
    return { message: "User deleted successfully" };
  }
}
```

## Testing Guards with cURL

### 1. Test Public Endpoints (No Token Required)

```bash
# ✅ Should work - Public endpoint
curl -X GET http://localhost:3000/nft

# ✅ Should work - Anyone can register
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x123...","username":"testuser"}'
```

### 2. Test Authenticated Endpoints

```bash
# ❌ Should fail - No token
curl -X GET http://localhost:3000/nft/my-nfts
# Response: 401 Unauthorized

# ✅ Should work - With valid token
curl -X GET http://localhost:3000/nft/my-nfts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Test Role-Based Access

```bash
# Login as regular user
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x123..."}' | jq -r '.access_token')

# ❌ Should fail - Regular user trying admin endpoint
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer $TOKEN"
# Response: 403 Forbidden

# ✅ Should work - Regular user accessing their own NFTs
curl -X GET http://localhost:3000/nft/my-nfts \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Test Ownership Controls

```bash
# User tries to update someone else's profile
curl -X PATCH http://localhost:3000/users/999 \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker"}'
# Response: 403 Forbidden - Can only access your own resources

# User updates their own profile
curl -X PATCH http://localhost:3000/users/1 \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"newname"}'
# Response: 200 OK - User can update own profile
```

## Error Messages by Guard Type

### JwtAuthGuard Failures

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### RolesGuard Failures

```json
{
  "statusCode": 403,
  "message": "Access denied. Required roles: admin. Your role: user"
}
```

### AdminGuard Failures

```json
{
  "statusCode": 403,
  "message": "Admin access required"
}
```

### OwnerOrAdminGuard Failures

```json
{
  "statusCode": 403,
  "message": "You can only access your own resources"
}
```

This guard system provides a comprehensive security model that ensures:

- 🔐 Authentication is required where needed
- 👑 Administrative functions are protected
- 🏠 Users can only access their own resources
- 📊 Different levels of access based on user roles
