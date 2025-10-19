# Collection-Based NFT Marketplace System

## Overview

The NFT marketplace has been redesigned to follow a collection-first approach, similar to OpenSea. Users first see collections, then can browse NFTs within each collection. This provides better organization and user experience.

## Database Design Changes

### New Collection Entity

```typescript
@Entity("collections")
export class Collection {
  id: number;
  name: string;
  description: string;
  bannerImageUrl: string;
  logoImageUrl: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  creatorId: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  nfts: NFT[];
  creator: User;
}
```

### Updated NFT Entity

```typescript
@Entity("nfts")
export class NFT {
  // ... existing fields ...
  collectionId: number; // NEW: Required field

  // Relations
  collection: Collection; // NEW: Many-to-one relationship
}
```

### Updated User Entity

```typescript
@Entity("users")
export class User {
  // ... existing fields ...

  // Relations
  ownedCollections: Collection[]; // NEW: One-to-many relationship
}
```

## API Endpoints

### Collection Endpoints

#### 1. Create Collection

```http
POST /collections
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Cool NFT Collection",
  "description": "A collection of amazing digital art pieces",
  "bannerImageUrl": "https://s3.amazonaws.com/bucket/banner.jpg",
  "logoImageUrl": "https://s3.amazonaws.com/bucket/logo.jpg",
  "websiteUrl": "https://coolnftcollection.com",
  "twitterUrl": "https://twitter.com/coolnftcollection",
  "discordUrl": "https://discord.gg/coolnftcollection"
}
```

#### 2. Get All Collections (with pagination)

```http
GET /collections?page=1&limit=10&search=cool
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Cool NFT Collection",
      "description": "A collection of amazing digital art pieces",
      "bannerImageUrl": "https://s3.amazonaws.com/bucket/banner.jpg",
      "logoImageUrl": "https://s3.amazonaws.com/bucket/logo.jpg",
      "websiteUrl": "https://coolnftcollection.com",
      "twitterUrl": "https://twitter.com/coolnftcollection",
      "discordUrl": "https://discord.gg/coolnftcollection",
      "creatorId": 1,
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "creator": {
        "id": 1,
        "walletAddress": "0x123...",
        "username": "creator1"
      },
      "nfts": []
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 3. Get Collection by ID

```http
GET /collections/1
```

#### 4. Get My Collections

```http
GET /collections/my-collections
Authorization: Bearer <token>
```

#### 5. Update Collection

```http
PATCH /collections/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Collection Name",
  "description": "Updated description"
}
```

#### 6. Delete Collection

```http
DELETE /collections/1
Authorization: Bearer <token>
```

#### 7. Get Collections for NFT Creation

```http
GET /collections/my-collections-for-nft
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": 1,
    "name": "My Collection",
    "description": "A collection I created",
    "bannerImageUrl": "https://s3.amazonaws.com/bucket/banner.jpg",
    "logoImageUrl": "https://s3.amazonaws.com/bucket/logo.jpg",
    "creatorId": 1,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### NFT Endpoints (Updated)

#### 1. Create NFT (now requires collectionId)

```http
POST /nft
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Cool NFT #123",
  "description": "A very cool digital art piece",
  "imageUrl": "https://s3.amazonaws.com/bucket/nft123.jpg",
  "price": 0.5,
  "isForSale": true,
  "contractAddress": "0xabc123...",
  "collectionId": 1
}
```

#### 2. Get All NFTs (with pagination)

```http
GET /nft?page=1&limit=10&search=cool
```

#### 3. Get NFTs by Collection

```http
GET /nft/collection/1?page=1&limit=10&search=cool
```

#### 4. Get Collections for NFT Creation

```http
GET /nft/collections-for-creation
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "id": 1,
    "name": "My Collection",
    "description": "A collection I created",
    "bannerImageUrl": "https://s3.amazonaws.com/bucket/banner.jpg",
    "logoImageUrl": "https://s3.amazonaws.com/bucket/logo.jpg",
    "creatorId": 1,
    "isVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Pagination System

### PaginationDto

```typescript
export class PaginationDto {
  page?: number = 1; // Page number (1-based)
  limit?: number = 10; // Items per page (max 100)
  search?: string; // Search query
}
```

### PaginatedResponseDto

```typescript
export class PaginatedResponseDto<T> {
  data: T[]; // Array of items
  meta: {
    page: number; // Current page
    limit: number; // Items per page
    total: number; // Total items
    totalPages: number; // Total pages
    hasNext: boolean; // Has next page
    hasPrev: boolean; // Has previous page
  };
}
```

## Usage Examples

### Frontend Flow

1. **Homepage**: Show collections with pagination

   ```javascript
   const collections = await fetch("/collections?page=1&limit=12");
   ```

2. **Collection Page**: Show NFTs in a specific collection

   ```javascript
   const nfts = await fetch("/nft/collection/1?page=1&limit=20");
   ```

3. **Search**: Search across collections or NFTs
   ```javascript
   const collections = await fetch("/collections?search=cool&page=1&limit=10");
   const nfts = await fetch("/nft?search=cool&page=1&limit=10");
   ```

### Collection Statistics

Collections include automatic statistics:

- Total NFT count
- NFTs for sale count
- Average price of NFTs for sale

## Migration Notes

### Database Migration Required

When deploying this update, the database will need to be migrated to:

1. Create the `collections` table
2. Add `collectionId` column to `nfts` table
3. Add foreign key constraints

### Breaking Changes

1. **NFT Creation**: Now requires `collectionId` field
2. **API Responses**: NFT endpoints now return paginated responses
3. **Collection Management**: New endpoints for collection CRUD operations

## Ownership & Security

### Collection Ownership

- **Users can only create collections for themselves** - The `creatorId` is automatically set to the authenticated user
- **Users can only update/delete their own collections** - Ownership validation prevents unauthorized access
- **Users can only add NFTs to their own collections** - Collection ownership is verified before NFT creation

### NFT Ownership

- **Users can only add NFTs to collections they own** - Collection ownership is validated during NFT creation
- **Users can only update/delete their own NFTs** - NFT ownership is verified for all operations
- **Collection ownership is enforced at the service level** - Prevents bypassing through direct API calls

### Security Features

- **JWT Authentication required** for all collection and NFT operations
- **Ownership validation** in all service methods
- **ForbiddenException** thrown for unauthorized access attempts
- **Collection existence verification** before NFT operations

## Benefits

1. **Better Organization**: NFTs are grouped by collections
2. **Improved UX**: Users can browse collections first, then NFTs
3. **Scalability**: Pagination prevents performance issues with large datasets
4. **Search**: Enhanced search capabilities across collections and NFTs
5. **Statistics**: Collection-level statistics for better insights
6. **Creator Focus**: Collections highlight creators and their work
7. **Security**: Strict ownership validation prevents unauthorized access
8. **Data Integrity**: Users can only manage their own content

## Future Enhancements

1. **Collection Verification**: Admin can verify collections
2. **Collection Categories**: Add category system for collections
3. **Collection Analytics**: Detailed analytics for collection performance
4. **Collection Templates**: Predefined collection templates
5. **Collection Collaboration**: Multiple creators per collection
