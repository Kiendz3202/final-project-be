import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import {
  S3Service,
  PresignedUrlRequest,
  PresignedUrlResponse,
} from "../common/services/s3.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GeneratePresignedUrlDto } from "./dto/generate-presigned-url.dto";

@ApiTags("Upload")
@Controller("upload")
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post("presigned-url")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate presigned URL for file upload" })
  @ApiResponse({
    status: 201,
    description: "Presigned URL generated successfully",
    schema: {
      type: "object",
      properties: {
        presignedUrl: { type: "string" },
        fileUrl: { type: "string" },
        fileName: { type: "string" },
        expiresIn: { type: "number" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Invalid file type or size" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async generatePresignedUrl(
    @Body() generatePresignedUrlDto: GeneratePresignedUrlDto
  ): Promise<PresignedUrlResponse> {
    const { fileName, fileType, fileSize } = generatePresignedUrlDto;

    // Validate file type
    if (!this.s3Service.validateFileType(fileType)) {
      throw new BadRequestException(
        "Invalid file type. Allowed types: jpeg, jpg, png, gif, webp"
      );
    }

    // Validate file size (if provided)
    if (fileSize && !this.s3Service.validateFileSize(fileSize)) {
      throw new BadRequestException("File size too large. Maximum size: 10MB");
    }

    const request: PresignedUrlRequest = {
      fileName,
      fileType,
      fileSize,
    };

    return this.s3Service.generatePresignedUrl(request);
  }

  @Post("presigned-url/metadata")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate presigned URL for metadata upload" })
  @ApiResponse({
    status: 201,
    description: "Presigned URL for metadata generated successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async generateMetadataPresignedUrl(
    @Body() metadata: any
  ): Promise<PresignedUrlResponse> {
    return this.s3Service.generateMetadataPresignedUrl(metadata);
  }
}
