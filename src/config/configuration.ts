export default () => ({
  port: parseInt(process.env.PORT, 10) || 5000,
  database: {
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || "nestjs_user",
    password: process.env.DATABASE_PASSWORD || "nestjs_password",
    name: process.env.DATABASE_NAME || "nestjs_db",
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-this-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    bucketName: process.env.AWS_S3_BUCKET_NAME || "your-s3-bucket",
  },
  app: {
    baseUrl: process.env.APP_BASE_URL, // e.g., "https://api.yourdomain.com" or "http://localhost:5000"
  },
});
