import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  // Handle the new user registration
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED) // Ensures it returns 201 Created
  async register(@Body() registerDto: RegisterDTO) {
    return this.authenticationService.register(registerDto);
  }

  // Handle user login
  @ApiOperation({ summary: 'Authenticate user and generate an access token' })
  @ApiResponse({ status: 200, description: 'User successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK) // Returns 200 instead of default 201 for POST
  @Post('login')
  async login(@Body() loginDto: LoginDTO) {
    return this.authenticationService.login(loginDto);
  }

  // handle the refresh token
  @Post('refresh')
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDTO) {
    return this.authenticationService.refreshTokens(refreshTokenDto);
  }

  // handle change password
  @Put('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDTO,
  ) {
    return this.authenticationService.changePassword(
      +req.user.userId,
      changePasswordDto,
    );
  }

  // handle forgot password
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDTO) {
    return this.authenticationService.forgotPassword(forgotPasswordDto);
  }

  // handle reset password
  @Put('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDTO) {
    return this.authenticationService.resetPassword(resetPasswordDto);
  }
}
