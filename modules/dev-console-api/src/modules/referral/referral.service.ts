import { Injectable } from '@nestjs/common';
import {
  ReferralMicroservice,
  CreateReferralDto,
  ConfirmRetweetDto,
  GithubOauthDto,
  TwitterOauthDto,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class ReferralService {
  async createReferral(context: DevConsoleApiContext, body: CreateReferralDto) {
    return (await new ReferralMicroservice(context).createReferral(body)).data;
  }

  async getReferral(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).getReferral()).data;
  }

  async linkGithub(context: DevConsoleApiContext, body: GithubOauthDto) {
    return (await new ReferralMicroservice(context).linkGithub(body)).data;
  }

  async linkTwitter(context: DevConsoleApiContext, body: TwitterOauthDto) {
    return (await new ReferralMicroservice(context).linkTwitter(body)).data;
  }

  async getTwitterAuthenticationLink(
    context: DevConsoleApiContext,
    url: string,
  ) {
    return (
      await new ReferralMicroservice(context).getTwitterAuthenticationLink(url)
    ).data;
  }

  async getTweets(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).getTweets()).data;
  }

  async confirmRetweet(context: DevConsoleApiContext, body: ConfirmRetweetDto) {
    return (await new ReferralMicroservice(context).confirmRetweet(body)).data;
  }
}
