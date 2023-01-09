import {
  CreateReferralDto,
  env,
  SerializeFor,
  SqlModelStatus,
  ConfirmRetweetDto,
  AppEnvironment,
  ProductQueryFilter,
  ProductOrderDto,
} from '@apillon/lib';
import { ServiceContext } from '../../context';
import {
  ReferralCodeException,
  ReferralValidationException,
} from '../../lib/exceptions';
import { Player } from './models/player.model';
import { DbTables, ReferralErrorCode } from '../../config/types';
import { HttpStatus } from '@nestjs/common';
import { Task, TaskType } from './models/task.model';
import { Twitter } from '../../lib/twitter';
import { Product } from './models/product.model';

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
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // Missing accepted terms
    if (!player.termsAccepted || player.status === SqlModelStatus.INCOMPLETE) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.MISSING_TERMS_ACCEPTANCE,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    await player.populateSubmodels();

    return player.serialize(SerializeFor.PROFILE);
  }

  static async getProducts(
    event: { query: ProductQueryFilter },
    context: ServiceContext,
  ): Promise<any> {
    return await new Product({}, context).getList(
      context,
      new ProductQueryFilter(event.query),
    );
  }

  static async orderProduct(
    event: { body: ProductOrderDto },
    context: ServiceContext,
  ): Promise<any> {
    const player: Player = await new Player({}, context).populateByUserUuid(
      context.user.user_uuid,
    );
    const product = await new Product({}, context).populateById(event.body.id);

    await product.order(player.id, event.body.info);

    await player.populateSubmodels();
    return player;
  }

  /**
   * Returns link used to get oAuth creds for twitter.
   */
  static async getTwitterAuthenticationLink(
    event: { url: string },
    context: ServiceContext,
  ) {
    const twitter = new Twitter();
    return await twitter.getTwitterAuthenticationLink(
      event?.url || env.OUATH_CALLBACK_URL,
      context,
    );
  }

  /**
   * Returns last 4 tweets from Apillon twitter.
   */
  static async getTweets(_event: any, context: ServiceContext) {
    const twitter = new Twitter();
    const tweets = await twitter.getLatestTweets();
    const player = await new Player({}, context).populateByUserUuid(
      context.user?.user_uuid,
    );
    if (player.exists()) {
      // Check if user has confirmed retweet for any tweet
      const data = await context.mysql.paramExecute(
        `
        SELECT JSON_VALUE(r.data, '$.tweet_id') as tweet 
        FROM \`${DbTables.REALIZATION}\` r
        JOIN \`${DbTables.TASK}\` t
        ON t.id = r.task_id
        WHERE t.type = ${TaskType.TWITTER_RETWEET}
        AND r.status = ${SqlModelStatus.ACTIVE}
        AND r.player_id = @playerId
        AND JSON_VALUE(r.data, '$.tweet_id') IN (${tweets.join(',')})
        `,
        { playerId: player.id },
      );
      const retweets = data.map((x) => x.tweet);
      return tweets.map((x) => {
        return { id: x, retweeted: retweets.includes(x) };
      });
    }
    return tweets.map((x) => {
      return { id: x, retweeted: false };
    });
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
        status: HttpStatus.BAD_REQUEST,
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
