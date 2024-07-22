import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OtpService } from './otp.service';
import { Ctx, Validation } from '@apillon/modules-lib';
import { GenerateOtpDto, ValidateOtpDto } from '@apillon/lib';
import { AuthenticationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Post()
  @Validation({ dto: GenerateOtpDto })
  @UseGuards(ValidationGuard)
  async generateOtp(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: GenerateOtpDto,
  ) {
    return await this.otpService.generateOtp(context, body);
  }

  @Post('validate')
  @Validation({ dto: ValidateOtpDto })
  @UseGuards(ValidationGuard)
  async validateOtp(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: ValidateOtpDto,
  ) {
    return await this.otpService.validateOtp(context, body);
  }
}
