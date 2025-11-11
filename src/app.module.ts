import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import configuration from "@/config/configuration";
import { AuthModule } from "@/auth/auth.module";
import { UsersModule } from "@/users/users.module";
import { NFTModule } from "@/nft/nft.module";
import { CollectionModule } from "@/collection/collection.module";
import { UploadModule } from "@/upload/upload.module";
import { AdminModule } from "@/admin/admin.module";
import { RedisModule } from "@/redis/redis.module";
import { User, NFT, Collection, NFTEvent } from "@/common/entities";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("database.host"),
        port: configService.get("database.port"),
        username: configService.get("database.username"),
        password: configService.get("database.password"),
        database: configService.get("database.name"),
        entities: [User, NFT, Collection, NFTEvent],
        synchronize: true, // Don't use in production
        logging: true,
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("jwt.secret"),
        signOptions: { expiresIn: configService.get("jwt.expiresIn") },
      }),
      inject: [ConfigService],
      global: true,
    }),
    RedisModule,
    AuthModule,
    UsersModule,
    NFTModule,
    CollectionModule,
    UploadModule,
    AdminModule,
  ],
})
export class AppModule {}
