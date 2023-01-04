import { env } from '../../../config/env';
import { AppEnvironment, ReferralEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { ConfirmRetweetDto } from './dtos/confirm-retweet.dto';
import { CreateReferralDto } from './dtos/create-referral.dto';
import { GithubOauthDto } from './dtos/github-oauth.dto';
import { TwitterOauthDto } from './dtos/twitter-oauth.dto';

export class ReferralMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.REFERRAL_FUNCTION_NAME_TEST
      : env.REFERRAL_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.REFERRAL_SOCKET_PORT_TEST
      : env.REFERRAL_SOCKET_PORT;
  serviceName = 'REFERRAL';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  //#region Referral CRUD

  public async createReferral(params: CreateReferralDto) {
    const data = {
      eventName: ReferralEventType.CREATE_REFERRAL,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getReferral() {
    const data = {
      eventName: ReferralEventType.GET_REFERRAL,
      body: {},
    };
    return await this.callService(data);
  }

  public async linkGithub(params: GithubOauthDto) {
    const data = {
      eventName: ReferralEventType.CONNECT_GITHUB,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async linkTwitter(params: TwitterOauthDto) {
    const data = {
      eventName: ReferralEventType.CONNECT_TWITTER,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getTwitterAuthenticationLink(url: string) {
    const data = {
      eventName: ReferralEventType.GET_TWITTER_LINK,
      url,
    };
    return await this.callService(data);
  }

  public async getTweets() {
    const data = {
      eventName: ReferralEventType.GET_TWEETS,
      body: {},
    };
    return await this.callService(data);
  }

  public async confirmRetweet(params: ConfirmRetweetDto) {
    const data = {
      eventName: ReferralEventType.CONFIRM_RETWEET,
      body: params.serialize(),
    };
    return await this.callService(data);
  }
}
