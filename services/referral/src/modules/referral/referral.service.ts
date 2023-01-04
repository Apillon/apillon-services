import {
  CreateReferralDto,
  env,
  SerializeFor,
  SqlModelStatus,
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
import { Task, TaskType } from './models/task.model';
import { Twitter } from '../../lib/twitter';

export class ReferralService {
  static async createReferral(
    event: { body: CreateReferralDto },
    context: ServiceContext,
  ): Promise<any> {
    const user_uuid = context?.user?.user_uuid;
    const user_email = context?.user?.email;
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
        user_uuid,
        user_email,
        refCode: code,
        referrer_id: referrer?.id,
        status: SqlModelStatus.INCOMPLETE,
      });
    }

    if (
      (!player.termsAccepted || player.status === SqlModelStatus.INCOMPLETE) &&
      event.body.termsAccepted
    ) {
      player.termsAccepted = player.termsAccepted || new Date();
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
    await player.populateSubmodels();
    return player.serialize(SerializeFor.PROFILE);
  }

  static async getReferral(_event: any, context: ServiceContext): Promise<any> {
    const player: Player = await new Player({}, context).populateByUserUuid(
      context?.user?.user_uuid,
    );

    // Player does not exist
    if (!player.id || player.status === SqlModelStatus.DELETED) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.PLAYER_DOES_NOT_EXISTS,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    // Missing accepted terms
    if (!player.termsAccepted || player.status === SqlModelStatus.INCOMPLETE) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.MISSING_TERMS_ACCEPTANCE,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }

    await player.populateSubmodels();

    return player.serialize(SerializeFor.PROFILE);
  }

  /**
   * Returns link used to get oAuth creds for twitter.
   */
  static async getTwitterAuthenticationLink(
    event: { url: string },
    context: ServiceContext,
  ) {
    const twitter = new Twitter();
    console.log('twitauth', event?.url || env.OUATH_CALLBACK_URL);
    return await twitter.getTwitterAuthenticationLink(
      event?.url || env.OUATH_CALLBACK_URL,
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
    if (env.APP_ENV !== AppEnvironment.TEST && !tweetData.includes(tweetId)) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.INVALID_TWEET,
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    }
    const retweetData = (await twitter.getRetweets(tweetId)) as any;
    const retweeted = retweetData.data.some(
      (x: any) => x.id === player.twitter_id,
    );
    if (retweeted) {
      const task = await new Task({}, context).populateByType(
        TaskType.TWITTER_RETWEET,
      );
      await task.confirmTask(player.id, { tweet_id: tweetId }, true);
    }

    await player.populateSubmodels();
    return { player: player.serialize(SerializeFor.PROFILE), retweeted };
  }
}
