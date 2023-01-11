import { Injectable } from '@nestjs/common';
import {
  ReferralMicroservice,
  CreateReferralDto,
  ConfirmRetweetDto,
  GithubOauthDto,
  TwitterOauthDto,
  ProductOrderDto,
  ProductQueryFilter,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class ReferralService {
  async createPlayer(context: DevConsoleApiContext, body: CreateReferralDto) {
    return (await new ReferralMicroservice(context).createPlayer(body)).data;
  }

  async getPlayer(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).getPlayer()).data;
  }

  async getProducts(context: DevConsoleApiContext, query: ProductQueryFilter) {
    return (await new ReferralMicroservice(context).getProducts(query)).data;
  }

  async orderProduct(context: DevConsoleApiContext, body: ProductOrderDto) {
    return (await new ReferralMicroservice(context).orderProduct(body)).data;
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
