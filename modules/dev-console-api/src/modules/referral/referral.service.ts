import { Injectable } from '@nestjs/common';
import { ReferralMicroservice, CreateReferralDto } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class ReferralService {
  async createReferral(context: DevConsoleApiContext, body: CreateReferralDto) {
    return (await new ReferralMicroservice(context).createReferral(body)).data;
  }

  async getReferral(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).getReferral()).data;
  }

  async getTweets(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).getTweets()).data;
  }

  async getTwitterAuthenticationLink(context: DevConsoleApiContext) {
    return (
      await new ReferralMicroservice(context).getTwitterAuthenticationLink()
    ).data;
  }
}
