import { Injectable } from '@nestjs/common';
import {
  ReferralMicroservice,
  CreateReferralDto,
  ConfirmRetweetDto,
  GithubOauthDto,
  TwitterOauthDto,
  ProductOrderDto,
  BaseQueryFilter,
  ReviewTasksDto,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { UserService } from '../user/user.service';

@Injectable()
export class ReferralService {
  constructor(private userService: UserService) {}
  /**
   * Creates a new referral player.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {CreateReferralDto} body - The referral player data to create.
   * @returns {Promise<any>} - The created referral player data.
   */
  async createPlayer(context: DevConsoleApiContext, body: CreateReferralDto) {
    return (await new ReferralMicroservice(context).createPlayer(body)).data;
  }

  /**
   * Retrieves the referral player data.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @returns {Promise<any>} - The referral player data.
   */
  async getPlayer(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).getPlayer()).data;
  }

  /**
   * Retrieves a list of referral products based on a query filter.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {BaseQueryFilter} query - Product query filter.
   * @returns {Promise<any>} - List of referral products.
   */
  async getProducts(context: DevConsoleApiContext, query: BaseQueryFilter) {
    return (await new ReferralMicroservice(context).getProducts(query)).data;
  }

  /**
   * Orders a referral product.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {ProductOrderDto} body - The referral product order data.
   * @returns {Promise<any>} - The ordered referral product data.
   */
  async orderProduct(context: DevConsoleApiContext, body: ProductOrderDto) {
    return (await new ReferralMicroservice(context).orderProduct(body)).data;
  }

  /**
   * Links a GitHub account to a referral player.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {GithubOauthDto} body - The GitHub OAuth data.
   * @returns {Promise<any>} - The player data with linked GitHub account.
   */
  async linkGithub(context: DevConsoleApiContext, body: GithubOauthDto) {
    return (await new ReferralMicroservice(context).linkGithub(body)).data;
  }

  /**
   * Unlinks a GitHub account from a referral player.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @returns {Promise<any>} - The player data.
   */
  async unlinkGithub(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).unlinkGithub()).data;
  }

  /**
   * Links a Twitter account to a referral player.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {TwitterOauthDto} body - The Twitter OAuth data.
   * @returns {Promise<any>} - The player data with linked Twitter account.
   */
  async linkTwitter(context: DevConsoleApiContext, body: TwitterOauthDto) {
    return (await new ReferralMicroservice(context).linkTwitter(body)).data;
  }

  /**
   * Unlinks a Twitter account from a referral player.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @returns {Promise<any>} - The player data.
   */
  async unlinkTwitter(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).unlinkTwitter()).data;
  }

  /**
   * Retrieves the Twitter authentication link.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {string} url - The URL to redirect to after authentication.
   * @returns {Promise<any>} - The Twitter authentication link.
   */
  async getTwitterAuthenticationLink(
    context: DevConsoleApiContext,
    url: string,
  ) {
    return (
      await new ReferralMicroservice(context).getTwitterAuthenticationLink(url)
    ).data;
  }

  /**
   * Retrieves the tweets to show to a referral player.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @returns {Promise<any>} - The tweets for the referral player.
   */
  async getTweets(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).getTweets()).data;
  }

  /**
   * Confirms the retweet of a referral player.
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @param {ConfirmRetweetDto} body - The retweet confirmation data.
   * @returns {Promise<any>} - The confirmed retweet data.
   */
  async confirmRetweet(context: DevConsoleApiContext, body: ConfirmRetweetDto) {
    return (await new ReferralMicroservice(context).confirmRetweet(body)).data;
  }

  /**
   * Get completed airdrop tasks and total points for a user
   *
   * @param {DevConsoleApiContext} context - Dev Console API context object.
   * @returns {Promise<any>} - UserAirdropTask model from Referral MS
   */
  async getAirdropTasks(context: DevConsoleApiContext): Promise<any> {
    return (
      await new ReferralMicroservice(context).getAirdropTasks(
        context.user.user_uuid,
      )
    ).data;
  }

  /**
   * Claim airdrop NCTR tokens
   * @param {DevConsoleApiContext} context
   * @param {ReviewTasksDto} body
   */
  async reviewTasks(context: DevConsoleApiContext, body: ReviewTasksDto) {
    const { address } = await this.userService.validateWalletSignature(
      body,
      'ReferralService/claimTokens',
      context,
    );
    body.wallet = address;
    return (await new ReferralMicroservice(context).reviewTasks(body)).data;
  }
}
