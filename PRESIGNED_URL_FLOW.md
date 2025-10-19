# Presigned URL Upload Flow

This document explains how to use presigned URLs for direct S3 uploads in the NFT marketplace.

## Overview

Instead of uploading files through the backend, the frontend now:

1. Gets a presigned URL from the backend
2. Uploads the file directly to S3 using the presigned URL
3. Uses the resulting S3 URL when creating an NFT

## API Endpoints

### 1. Generate Presigned URL

**POST** `/upload/presigned-url`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "fileName": "my-nft-image.jpg",
  "fileType": "image/jpeg",
  "fileSize": 1024000
}
```

**Response:**

```json
{
  "presignedUrl": "https://your-s3-bucket.s3.us-east-1.amazonaws.com/nfts/1234567890-my-nft-image.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256...",
  "fileUrl": "https://your-s3-bucket.s3.us-east-1.amazonaws.com/nfts/1234567890-my-nft-image.jpg",
  "fileName": "nfts/1234567890-my-nft-image.jpg",
  "expiresIn": 3600
}
```

### 2. Create NFT with Image URL

**POST** `/nft`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "Cool NFT #123",
  "description": "A very cool digital art piece",
  "imageUrl": "https://your-s3-bucket.s3.us-east-1.amazonaws.com/nfts/1234567890-my-nft-image.jpg",
  "price": 0.5,
  "isForSale": true
}
```

## Frontend Implementation Example

### JavaScript/TypeScript Example

```javascript
async function uploadImageAndCreateNFT(file, nftData) {
  try {
    // Step 1: Get presigned URL
    const presignedResponse = await fetch("/upload/presigned-url", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });

    const { presignedUrl, fileUrl } = await presignedResponse.json();

    // Step 2: Upload file directly to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to S3");
    }

    // Step 3: Create NFT with the S3 URL
    const nftResponse = await fetch("/nft", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...nftData,
        imageUrl: fileUrl,
      }),
    });

    const nft = await nftResponse.json();
    return nft;
  } catch (error) {
    console.error("Error creating NFT:", error);
    throw error;
  }
}

// Usage
const fileInput = document.getElementById("file-input");
const file = fileInput.files[0];

const nftData = {
  name: "My Cool NFT",
  description: "This is an amazing digital art piece",
  price: 0.5,
  isForSale: true,
};

uploadImageAndCreateNFT(file, nftData)
  .then((nft) => console.log("NFT created:", nft))
  .catch((error) => console.error("Error:", error));
```

### React Example with File Upload

```jsx
import React, { useState } from "react";

function NFTUploader({ userToken }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);

    try {
      // Get presigned URL
      const presignedResponse = await fetch("/upload/presigned-url", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const { presignedUrl, fileUrl } = await presignedResponse.json();

      // Upload to S3
      await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      // Create NFT
      const formData = new FormData(e.target);
      const nftData = {
        name: formData.get("name"),
        description: formData.get("description"),
        imageUrl: fileUrl,
        price: parseFloat(formData.get("price")),
        isForSale: formData.get("isForSale") === "on",
      };

      const nftResponse = await fetch("/nft", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nftData),
      });

      const nft = await nftResponse.json();
      console.log("NFT created:", nft);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        required
      />
      <input name="name" placeholder="NFT Name" required />
      <textarea name="description" placeholder="Description" />
      <input
        name="price"
        type="number"
        step="0.001"
        placeholder="Price in ETH"
      />
      <label>
        <input name="isForSale" type="checkbox" />
        For Sale
      </label>
      <button type="submit" disabled={uploading}>
        {uploading ? "Creating NFT..." : "Create NFT"}
      </button>
    </form>
  );
}
```

## File Validation

The API validates:

- **File types**: jpeg, jpg, png, gif, webp
- **File size**: Maximum 10MB
- **File name**: Automatically sanitized

## Benefits

1. **Reduced server load**: Files go directly to S3
2. **Better performance**: No file transfer through backend
3. **Scalability**: Backend doesn't handle large file uploads
4. **Cost efficiency**: Lower bandwidth usage on backend
5. **S3 Integration**: Full AWS S3 ecosystem benefits (CDN, versioning, security)
6. **No IPFS dependency**: Simpler architecture without blockchain storage complexity

## Security

- Presigned URLs expire after 1 hour
- Only authenticated users can generate presigned URLs
- File type validation prevents malicious uploads
- File size limits prevent abuse

## Environment Variables

Add these to your `.env` file when S3 credentials are available:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET_NAME=your-s3-bucket-name
```

## Testing

Currently, the API returns mock presigned URLs. When you add real S3 credentials, the presigned URLs will work with actual S3 buckets.

### Test the endpoint:

```bash
# 1. Login to get token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234567890abcdef1234567890abcdef12345678"}'

# 2. Generate presigned URL
curl -X POST http://localhost:3000/upload/presigned-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test-image.jpg",
    "fileType": "image/jpeg",
    "fileSize": 1024000
  }'

# 3. Create NFT with image URL
curl -X POST http://localhost:3000/nft \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test NFT",
    "description": "Test description",
    "imageUrl": "https://your-s3-bucket.s3.amazonaws.com/nfts/1234567890-test-image.jpg",
    "price": 0.5,
    "isForSale": true
  }'
```
