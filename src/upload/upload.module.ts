import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { UploadController } from "./upload.controller";
import { S3Service } from "@/common/services/s3.service";
import { UrlService } from "@/common/services/url.service";
import { UPLOADS_IMAGES_DIR } from "@/common/constants";

function editFileName(
  _: any,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void
) {
  const fileExtName = extname(file.originalname).toLowerCase();
  const baseName = file.originalname
    .replace(fileExtName, "")
    .replace(/\s+/g, "_");
  const unique = Date.now();
  callback(null, `${baseName}_${unique}${fileExtName}`);
}

function imageFileFilter(
  _: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void
) {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/bmp",
    "image/svg+xml",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new Error(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(", ")}`
      ),
      false
    );
  }
  callback(null, true);
}

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: UPLOADS_IMAGES_DIR,
        filename: editFileName,
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }),
  ],
  controllers: [UploadController],
  providers: [S3Service, UrlService],
  exports: [S3Service],
})
export class UploadModule {}
