import {
  AuthenticationMicroservice,
  CreateOasisSignatureDto,
  GenerateOtpDto,
  ValidateOtpDto,
  getEvmTokenPrices as getTopEvmTokenPrices,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class EmbeddedWalletService {
  async createOasisSignature(
    context: ApillonApiContext,
    body: CreateOasisSignatureDto,
  ) {
    return (
      await new AuthenticationMicroservice(context).createOasisSignature(body)
    ).data;
  }

  async generateOtp(
    context: ApillonApiContext,
    body: GenerateOtpDto,
  ): Promise<void> {
    return (await new AuthenticationMicroservice(context).generateOtp(body))
      .data;
  }

  async validateOtp(context: ApillonApiContext, body: ValidateOtpDto) {
    return (await new AuthenticationMicroservice(context).validateOtp(body))
      .data;
  }

  async getEvmTokenPrices() {
    return await getTopEvmTokenPrices();
  }
}
