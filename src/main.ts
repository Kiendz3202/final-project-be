import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import { AppModule } from "@/app.module";
import { UPLOADS_PREFIX } from "@/common/constants";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Enable CORS with specific configuration
  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:5000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // Set global prefix
  app.setGlobalPrefix("api");

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, "..", "uploads"), {
    prefix: `${UPLOADS_PREFIX}/`,
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle("NestJS Final Project API")
    .setDescription(
      "API documentation for NestJS project with TypeORM, Redis, and JWT"
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get<number>("port") || 5000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
