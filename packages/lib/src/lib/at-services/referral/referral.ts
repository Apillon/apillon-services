import { env } from '../../../config/env';
import { AppEnvironment, ReferralEventType } from '../../../config/types';
import { BaseQueryFilter } from '../../base-models/base-query-filter.model';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { ReviewTasksDto } from './dtos/review-tasks.dto';
import { ConfirmRetweetDto } from './dtos/confirm-retweet.dto';
import { CreateReferralDto } from './dtos/create-referral.dto';
import { GithubOauthDto } from './dtos/github-oauth.dto';
import { ProductOrderDto } from './dtos/product-order.dto';
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

  public async createPlayer(params: CreateReferralDto) {
    const data = {
      eventName: ReferralEventType.CREATE_PLAYER,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getPlayer() {
    const data = {
      eventName: ReferralEventType.GET_PLAYER,
      body: {},
    };
    return await this.callService(data);
  }

  public async getProducts(params: BaseQueryFilter) {
    const data = {
      eventName: ReferralEventType.GET_PRODUCTS,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async orderProduct(params: ProductOrderDto) {
    const data = {
      eventName: ReferralEventType.ORDER_PRODUCT,
      body: params.serialize(),
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

  public async unlinkGithub() {
    const data = {
      eventName: ReferralEventType.DISCONNECT_GITHUB,
      body: {},
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

  public async unlinkTwitter() {
    const data = {
      eventName: ReferralEventType.DISCONNECT_TWITTER,
      body: {},
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

  public async addPromoCodeCredits(project_uuid: string, email: string) {
    return await this.callService({
      eventName: ReferralEventType.ADD_PROMO_CODE_CREDITS,
      project_uuid,
      email,
    });
  }

  public async getAirdropTasks() {
    return await this.callService({
      eventName: ReferralEventType.GET_AIRDROP_TASKS,
    });
  }

  public async reviewTasks(body: ReviewTasksDto) {
    return await this.callService({
      eventName: ReferralEventType.REVIEW_TASKS,
      body: body.serialize(),
    });
  }

  public async getClaimParameters() {
    return await this.callService({
      eventName: ReferralEventType.GET_CLAIM_PARAMETERS,
    });
  }

  public async setClaimsCompleted(
    data: {
      wallet: string;
      transactionHash: string;
    }[],
  ) {
    this.isDefaultAsync = true; // This does not need to return a response
    return await this.callService({
      eventName: ReferralEventType.SET_CLAIMS_COMPLETED,
      data,
    });
  }
}
