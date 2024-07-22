import { Injectable } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import {
  AuthenticationMicroservice,
  GenerateOtpDto,
  ValidateOtpDto,
} from '@apillon/lib';

@Injectable()
export class OtpService {
  async generateOtp(
    context: AuthenticationApiContext,
    body: GenerateOtpDto,
  ): Promise<void> {
    return (await new AuthenticationMicroservice(context).generateOtp(body))
      .data;
  }

  async validateOtp(context: AuthenticationApiContext, body: ValidateOtpDto) {
    return (await new AuthenticationMicroservice(context).validateOtp(body))
      .data;
  }
}
