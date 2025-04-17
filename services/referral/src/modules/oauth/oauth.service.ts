/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/naming-convention */
import {
  env,
  GithubOauthDto,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  TwitterOauthDto,
} from '@apillon/lib';

import axios from 'axios';
import { ReferralErrorCode } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import {
  ReferralCodeException,
  ReferralValidationException,
} from '../../lib/exceptions';
import { Twitter } from '../../lib/twitter';
import { Player } from '../referral/models/player.model';
import { Task, TaskType } from '../referral/models/task.model';
import { OauthTokenPair } from './models/oauth-token-pairs';

export class OauthService {
  static async unlinkTwitter(_event: any, context: ServiceContext) {
    const player = await new Player({}, context).populateByUserUuid(
      context.user.user_uuid,
    );

    player.twitter_id = null;
    player.twitter_name = null;

    await player.validateOrThrow(ReferralValidationException);
    await player.update();
    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: 'Twitter disconnected!',
      location: 'Referral/OauthService/unlinkTwitter',
      service: ServiceName.REFERRAL,
    });

    return player.serialize(SerializeFor.PROFILE);
  }
  static async unlinkGithub(_event: any, context: ServiceContext) {
    const player = await new Player({}, context).populateByUserUuid(
      context.user.user_uuid,
    );

    player.github_id = null;
    player.github_name = null;

    await player.validateOrThrow(ReferralValidationException);
    await player.update();
    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: 'Github disconnected!',
      location: 'Referral/OauthService/unlinkGithub',
      service: ServiceName.REFERRAL,
    });

    return player.serialize(SerializeFor.PROFILE);
  }

  /**
   * Link the twitter account to the user (Auth user). The oAuth credentials must received be from the authenticate (/oauth/twitter/authenticate).
   */
  static async linkTwitter(
    event: { body: TwitterOauthDto },
    context: ServiceContext,
  ) {
    const oAuthData = event.body;
    const twitter = new Twitter();

    const task: Task = await new Task({}, context).populateByType(
      TaskType.TWITTER_CONNECT,
    );

    const player = await new Player({}, context).populateByUserUuid(
      context.user.user_uuid,
    );
    if (!player.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.PLAYER_DOES_NOT_EXISTS,
        status: 400,
      });
    }
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
        status: 400,
        context,
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
        status: 400,
        context,
        sourceFunction: `${this.constructor.name}/oauth`,
      });
    }

    player.twitter_id = loggedTokens.userId;
    player.twitter_name = loggedTokens.screenName;
    // allTwitterData.userName

    await player.validateOrThrow(ReferralValidationException);

    const conn = await context.mysql.start();
    try {
      await player.update(SerializeFor.UPDATE_DB, conn);
      // Complete twitter task if present
      if (task.exists()) {
        try {
          await task.confirmTask(
            player.id,
            { id: player.twitter_id },
            false,
            conn,
          );
        } catch (error) {
          console.log(error);
        }
      }
      await context.mysql.commit(conn);
      await new Lmas().writeLog({
        context,
        logType: LogType.INFO,
        message: 'Twitter connected!',
        location: 'Referral/OauthService/linkTwitter',
        service: ServiceName.REFERRAL,
      });
    } catch (error) {
      await context.mysql.rollback(conn);
      throw new ReferralCodeException({
        status: 400,
        code: ReferralErrorCode.ERROR_LINKING_TWITTER,
      });
    }
    await player.populateSubmodels();
    return player.serialize(SerializeFor.PROFILE);
  }

  /**
   * Link the Github account to the user (Auth user).
   */
  static async linkGithub(
    event: { body: GithubOauthDto },
    context: ServiceContext,
  ): Promise<any> {
    const player: Player = await new Player({}, context).populateByUserUuid(
      context?.user?.user_uuid,
    );
    if (!player.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.PLAYER_DOES_NOT_EXISTS,
        status: 400,
      });
    }

    const task: Task = await new Task({}, context).populateByType(
      TaskType.GITHUB_CONNECT,
    );

    // get user access token
    // FE gets the code by calling https://github.com/login/oauth/authorize?client_id=#
    const res = await axios.post(
      `https://github.com/login/oauth/access_token?client_id=${env.GITHUB_AUTH_CLIENT_ID}&client_secret=${env.GITHUB_AUTH_CLIENT_SECRET}&code=${event.body.code}`,
      {},
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (res?.data?.access_token) {
      // get user profile
      const gitUser = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${res?.data?.access_token}`,
        },
      });

      if (!gitUser?.data?.id) {
        throw new ReferralCodeException({
          status: 400,
          code: ReferralErrorCode.OAUTH_APP_DENIED_OR_SESSION_EXPIRED, // getting github user
        });
      }
      // check if oauth with the same account id exists
      const existingOauth = await new Player({}, context).populateByGithubId(
        gitUser?.data?.id,
      );

      if (existingOauth.exists()) {
        throw new ReferralCodeException({
          code: ReferralErrorCode.OAUTH_USER_ID_ALREADY_PRESENT,
          status: 400,
          context,
          sourceFunction: `${this.constructor.name}/oauth`,
        });
      }

      player.github_id = gitUser?.data?.id;
      player.github_name = gitUser?.data?.login;
      const conn = await context.mysql.start();
      try {
        await player.validateOrThrow(ReferralValidationException);
        await player.update(SerializeFor.UPDATE_DB, conn);
        // Complete github task if present
        if (task.exists()) {
          try {
            await task.confirmTask(
              player.id,
              { id: player.github_id },
              false,
              conn,
            );
          } catch (error) {
            console.log(error);
          }
        }
        // If player was referred, reward the referrer
        if (player.referrer_id) {
          const referrer = await new Player({}, context).populateById(
            player.referrer_id,
          );
          if (referrer.exists()) {
            await referrer.confirmRefer(player.id, conn);
          }
        }
        await context.mysql.commit(conn);
        await new Lmas().writeLog({
          context,
          logType: LogType.INFO,
          message: 'Github connected!',
          location: 'Referral/OauthService/linkGithub',
          service: ServiceName.REFERRAL,
        });
      } catch (error) {
        await context.mysql.rollback(conn);
        throw new ReferralCodeException({
          status: 500,
          code: ReferralErrorCode.ERROR_LINKING_GITHUB,
        });
      }
    } else {
      throw new ReferralCodeException({
        status: 400,
        code: ReferralErrorCode.OAUTH_APP_DENIED_OR_SESSION_EXPIRED, // getting access token
      });
    }

    await player.populateSubmodels();
    return player.serialize(SerializeFor.PROFILE);
  }
}
