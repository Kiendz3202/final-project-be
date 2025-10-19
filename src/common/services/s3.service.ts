import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface PresignedUrlResponse {
  presignedUrl: string;
  fileUrl: string;
  fileName: string;
  expiresIn: number;
}

export interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
  fileSize?: number;
}

@Injectable()
export class S3Service {
  constructor(private configService: ConfigService) {}

  async generatePresignedUrl(
    request: PresignedUrlRequest,
    folder: string = "nfts"
  ): Promise<PresignedUrlResponse> {
    // TODO: Implement actual S3 presigned URL generation when API keys are available
    // For now, return hardcoded URLs
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(request.fileName);
    const fileName = `${folder}/${timestamp}-${sanitizedFileName}`;

    const bucketName =
      this.configService.get("aws.bucketName") || "your-s3-bucket";
    const region = this.configService.get("aws.region") || "us-east-1";

    const presignedUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock&X-Amz-Date=mock&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=mock`;
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

    console.log(`Mock presigned URL generated: ${presignedUrl}`);

    return {
      presignedUrl,
      fileUrl,
      fileName,
      expiresIn: 3600, // 1 hour
    };
  }

  async generateMetadataPresignedUrl(
    metadata: any
  ): Promise<PresignedUrlResponse> {
    const fileName = `metadata-${Date.now()}.json`;
    return this.generatePresignedUrl(
      {
        fileName,
        fileType: "application/json",
      },
      "metadata"
    );
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // TODO: Implement actual S3 delete when API keys are available
    console.log(`Mock S3 delete: ${fileUrl}`);
  }

  validateFileType(fileType: string): boolean {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/json",
    ];
    return allowedTypes.includes(fileType.toLowerCase());
  }

  validateFileSize(fileSize: number, maxSizeInMB: number = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return fileSize <= maxSizeInBytes;
  }

  private sanitizeFileName(fileName: string): string {
    // Remove special characters and spaces, keep only alphanumeric, dots, and hyphens
    return fileName.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
  }

  // Future implementation when S3 credentials are available:
  /*
  private getS3Client() {
    return new S3Client({
      region: this.configService.get('aws.region'),
      credentials: {
        accessKeyId: this.configService.get('aws.accessKeyId'),
        secretAccessKey: this.configService.get('aws.secretAccessKey'),
      },
    });
  }

  async generateActualPresignedUrl(request: PresignedUrlRequest, folder: string = "nfts"): Promise<PresignedUrlResponse> {
    const s3Client = this.getS3Client();
    const bucketName = this.configService.get('aws.bucketName');
    const fileName = `${folder}/${Date.now()}-${this.sanitizeFileName(request.fileName)}`;
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      ContentType: request.fileType,
      ContentLength: request.fileSize,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const fileUrl = `https://${bucketName}.s3.${this.configService.get('aws.region')}.amazonaws.com/${fileName}`;

    return {
      presignedUrl,
      fileUrl,
      fileName,
      expiresIn: 3600,
    };
  }
  */
}
