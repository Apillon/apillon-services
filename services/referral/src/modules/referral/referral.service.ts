import {
  CreateReferralDto,
  env,
  GithubOauthDto,
  SerializeFor,
  SqlModelStatus,
  TwitterOauthDto,
  ConfirmRetweetDto,
  AppEnvironment,
} from '@apillon/lib';
import { ServiceContext } from '../../context';
import {
  ReferralCodeException,
  ReferralValidationException,
} from '../../lib/exceptions';
import { Player } from './models/player.model';
import { ReferralErrorCode } from '../../config/types';
import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Task, TaskType } from './models/task.model';
import { OauthTokenPair } from '../oauth/models/oauth-token-pairs';
import { Twitter } from '../../lib/twitter';

export class ReferralService {
  static async createReferral(
    event: { body: CreateReferralDto },
    context: ServiceContext,
  ): Promise<any> {
    const user_uuid = context?.user?.user_uuid || event.body?.user_uuid;
    const player: Player = await new Player({}, context).populateByUserUuid(
      user_uuid,
    );

    let referrer: Player = null;

    if (event.body.refCode) {
      referrer = await new Player({}, context).populateByRefCode(
        event.body.refCode,
      );
    }

    if (!player.exists()) {
      const code = await player.generateCode();
      player.populate({
        user_uuid: user_uuid,
        refCode: code,
        referrer_id: referrer?.id,
        status: SqlModelStatus.INCOMPLETE,
      });
    }

    if (!player.termsAccepted && event.body.termsAccepted) {
      player.termsAccepted = new Date();
      player.status = SqlModelStatus.ACTIVE;
    }

    try {
      await player.validate();
    } catch (err) {
      await player.handle(err);
      if (!player.isValid()) throw new ReferralValidationException(player);
    }

    if (player.exists()) {
      await player.update();
    } else {
      await player.insert();
    }
    return player.serialize(SerializeFor.PROFILE);
  }

  static async getReferral(_event: any, context: ServiceContext): Promise<any> {
    const player: Player = await new Player({}, context).populateByUserUuid(
      context?.user?.user_uuid,
    );

    // Player does not exist
    if (!player.id || player.status === SqlModelStatus.DELETED) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    // Missing accepted terms
    if (!player.termsAccepted || player.status === SqlModelStatus.INCOMPLETE) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    await player.populateTasks();

    return player.serialize(SerializeFor.PROFILE);
  }

  /**
   * Returns link used to get oAuth creds for twitter.
   */
  static async getTwitterAuthenticationLink(
    _event: any,
    context: ServiceContext,
  ) {
    const twitter = new Twitter();
    return await twitter.getTwitterAuthenticationLink(
      'http://localhost:3000/',
      context,
    );
  }

  /**
   * Returns last 4 tweets from Apillon twitter.
   */
  static async getTweets(_event: any, _context: ServiceContext) {
    const twitter = new Twitter();
    return await twitter.getLatestTweets();
  }

  /**
   * Confirm user retweet
   */
  static async confirmRetweet(
    event: { body: ConfirmRetweetDto },
    context: ServiceContext,
  ) {
    const twitter = new Twitter();
    const tweetId = event.body.tweet_id;
    const user_uuid = context.user.user_uuid;
    const player = await new Player({}, context).populateByUserUuid(user_uuid);
    if (!player.exists()) {
      return;
    }
    const tweetData = (await twitter.getLatestTweets()) as any;
    console.log('retweetdata', tweetData);
    if (env.APP_ENV !== AppEnvironment.TEST && !tweetData.includes(tweetId)) {
      return { error: 'test' };
      // Invalid twitter
    }
    const retweetData = (await twitter.getRetweets(tweetId)) as any;
    const retweeted = retweetData.data.some(
      (x: any) => x.id === player.twitter_id,
    );
    if (retweeted) {
      const task = await new Task({}, context).populateByType(
        TaskType.TWITTER_RETWEET,
      );
      await task.confirmTask(player.id, { tweet_id: tweetId });
    }
    return { retweeted };
  }

  /**
   * Link the twitter account to the user (Auth user). The oAuth credentials must received be from the authenticate (getTwitterAuthenticationLink()).
   */
  public async linkTwitter(
    event: { body: TwitterOauthDto },
    context: ServiceContext,
  ) {
    const oAuthData = event.body;
    const twitter = new Twitter();

    const task: Task = await new Task({}, context).populateByType(
      TaskType.TWITTER_CONNECT,
    );

    // check if unlinked before linking
    const player = await new Player({}, context).populateByUserUuid(
      context.user.user_uuid,
    );
    const pair = await new OauthTokenPair({}, context).populateByToken(
      oAuthData.oauth_token,
    );
    const loggedTokens = await twitter.getTwitterLoginCredentials(
      oAuthData,
      pair.oauth_secret,
    );
    // const allTwitterData = await this.getAccountDetails(loggedTokens);

    if (!loggedTokens) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.OAUTH_PROFILE_CREDENTIALS_INVALID,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        context: context,
        sourceFunction: `${this.constructor.name}/oauth`,
      });
    }

    // check if oauth with the same account id exists
    const existingOauth = await new Player({}, context).populateByTwitterId(
      loggedTokens.userId,
    );

    if (existingOauth.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.OAUTH_USER_ID_ALREADY_PRESENT,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        context: context,
        sourceFunction: `${this.constructor.name}/oauth`,
      });
    }

    player.twitter_id = loggedTokens.userId;
    // allTwitterData.userName
    try {
      await player.validate();
    } catch (err) {
      await player.handle(err);
      throw new ReferralValidationException(player);
    }
    await player.update();
    // Complete twitter task if present
    if (task.exists()) {
      await task.confirmTask(player.id);
    }
    return player.serialize(SerializeFor.PROFILE);
  }

  /**
   * Link the Github account to the user (Auth user).
   */
  public async linkGithub(
    event: { body: GithubOauthDto },
    context: ServiceContext,
  ): Promise<any> {
    const player: Player = await new Player({}, context).populateByUserUuid(
      context?.user?.user_uuid,
    );
    if (!player.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const task: Task = await new Task({}, context).populateByType(
      TaskType.GITHUB_CONNECT,
    );

    // get user access token
    // FE gets the code by calling https://github.com/login/oauth/authorize?client_id=#
    const res = await axios.post(
      `https://github.com/login/oauth/access_token?client_id=${env.GITHUB_CLIENT_ID}&client_secret=${env.GITHUB_CLIENT_SECRET}&code=${event.body.code}`,
    );

    if (res?.data?.access_token) {
      // get user profile
      const gitUser = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: 'token ' + res?.data?.access_token,
        },
      });

      if (gitUser?.data?.id) {
        player.github_id = gitUser?.data?.id;
        try {
          await player.validate();
        } catch (err) {
          await player.handle(err);
          throw new ReferralValidationException(player);
        }
        await player.update();
        // Complete github task if present
        if (task.exists()) {
          await task.confirmTask(player.id);
        }
        await task.confirmTask(player.id);
        // If player was referred, reward the referrer
        if (player.referrer_id) {
          const referrer = await new Player({}, context).populateById(
            player.referrer_id,
          );
          if (referrer.exists()) {
            await referrer.confirmRefer(player.id);
          }
        }
      } else {
        throw new ReferralCodeException({
          status: 500,
          code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR, // getting github user
        });
      }
    } else {
      throw await new ReferralCodeException({
        status: 500,
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR, // getting access token
      });
    }

    return player.serialize(SerializeFor.PROFILE);
  }
}
