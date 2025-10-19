import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { VerifyDto, VerifyResponseDto } from "./dto/verify.dto";
import { NonceResponseDto } from "./dto/nonce.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Login user" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string" },
        user: { type: "object" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout user" })
  @ApiResponse({ status: 200, description: "Logout successful" })
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "User profile retrieved" })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Post("nonce")
  @ApiOperation({ summary: "Generate nonce for SIWE authentication" })
  @ApiResponse({
    status: 200,
    description: "Nonce generated successfully",
    type: NonceResponseDto,
  })
  async generateNonce(): Promise<NonceResponseDto> {
    return this.authService.generateNonce();
  }

  @Post("verify")
  @ApiOperation({ summary: "Verify SIWE message and signature" })
  @ApiResponse({
    status: 200,
    description: "Verification successful",
    type: VerifyResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid signature" })
  async verifySiweMessage(
    @Body() verifyDto: VerifyDto
  ): Promise<VerifyResponseDto> {
    return this.authService.verifySiweMessage(verifyDto);
  }
}
