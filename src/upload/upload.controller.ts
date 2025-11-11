import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiBadRequestResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  S3Service,
  PresignedUrlRequest,
  PresignedUrlResponse,
} from "@/common/services/s3.service";
import { UrlService } from "@/common/services/url.service";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { GeneratePresignedUrlDto } from "./dto/generate-presigned-url.dto";

@ApiTags("Upload")
@Controller("upload")
export class UploadController {
  constructor(
    private readonly s3Service: S3Service,
    private readonly urlService: UrlService
  ) {}

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
        "Invalid file type. Allowed types: jpeg, jpg, png, gif, webp, avif"
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

  @Post("image")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a single image" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Image file payload",
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    },
  })
  @ApiOkResponse({
    description: "Image uploaded successfully",
    schema: {
      type: "object",
      properties: {
        filename: { type: "string", example: "my_image_1234567890.jpg" },
        originalName: { type: "string", example: "my image.jpg" },
        mimetype: { type: "string", example: "image/jpeg" },
        size: { type: "number", example: 102400 },
        url: {
          type: "string",
          example:
            "http://localhost:5000/uploads/images/my_image_1234567890.jpg",
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: "Invalid file" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
        fileIsRequired: true,
      })
    )
    file: Express.Multer.File
  ) {
    if (!file) throw new BadRequestException("No file uploaded");

    const fileUrl = this.urlService.getImageUrl(file.filename);

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: fileUrl, // Full URL with domain
    };
  }
}
