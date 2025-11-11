import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UPLOADS_IMAGES_PATH } from "@/common/constants";

@Injectable()
export class UrlService {
  constructor(private configService: ConfigService) {}

  /**
   * Get base URL for the application
   * Uses APP_BASE_URL env var, or falls back to constructed from PORT
   */
  getBaseUrl(): string {
    const baseUrl = this.configService.get<string>("app.baseUrl");
    if (baseUrl) {
      return baseUrl;
    }

    // Fallback: construct from PORT (defaults to 5000)
    const port = this.configService.get<number>("port", 5000);
    return `http://localhost:${port}`;
  }

  /**
   * Get full URL for uploaded files
   * @param path - Relative path (e.g., "/uploads/images/filename.jpg")
   */
  getFileUrl(path: string): string {
    const baseUrl = this.getBaseUrl();
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  /**
   * Get full URL for uploaded image file
   * @param filename - Image filename (e.g., "image_1234567890.jpg")
   */
  getImageUrl(filename: string): string {
    return this.getFileUrl(`${UPLOADS_IMAGES_PATH}/${filename}`);
  }
}
