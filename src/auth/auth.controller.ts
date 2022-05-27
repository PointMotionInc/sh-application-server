import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from 'src/services/auth/auth.service';
import { JwtService } from 'src/services/jwt/jwt.service';
import { PatientAuthService } from 'src/services/auth/patient/auth.service';
import { PatientJwtService } from 'src/services/jwt/patient/jwt.service';
import { LoginRequestDto, RequestResetPasswordDto, ResetPasswordDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private patientAuthService: PatientAuthService,
    private patientJwtServive: PatientJwtService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginRequestDto) {
    const user = await this.authService.login(body);
    if (!user) {
      throw new HttpException('Invalid Email Password Combination', HttpStatus.BAD_REQUEST);
    }
    const token = this.jwtService.generate(user);
    return { token, user };
  }

  @Post('patient/login')
  @HttpCode(200)
  async patientLogin(@Body() body: LoginRequestDto) {
    const patient = await this.patientAuthService.login(body);
    if (!patient) {
      throw new HttpException('Invalid Email Password Combination', HttpStatus.BAD_REQUEST);
    }
    const token = this.patientJwtServive.generate(patient);
    return { token, patient };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  async me(@Headers() headers) {
    // Get user id from the verified JWT token
    const userDetails = this.jwtService.verify(headers.authorization);
    if (!userDetails) {
      throw new HttpException('Invalid JWT', HttpStatus.BAD_REQUEST);
    }
    console.log(userDetails.id);

    // fetch user details from the database
    const user = await this.authService.getUser(userDetails.id);
    return user;
  }

  @Post('/request-password-reset-link')
  async requestPasswordResetLink(@Body() body: RequestResetPasswordDto) {
    const user = await this.authService.findUserByEmail(body.email);
    if (user) {
      const url = await this.authService.generatePasswordResetURL(user);
      this.authService.sendPasswordResetEmail(user, url);
    }
    return { result: true };
  }

  @Post('/reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    const user = await this.authService.resetPassword(body.code, body.password);
    const token = this.jwtService.generate(user);
    return { token, user };
  }
}
