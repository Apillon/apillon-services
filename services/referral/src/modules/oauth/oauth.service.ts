/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/naming-convention */
import {
  env,
  GithubOauthDto,
  SerializeFor,
  TwitterOauthDto,
} from '@apillon/lib';
import { Injectable, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ReferralErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import {
  ReferralCodeException,
  ReferralValidationException,
} from '../../lib/exceptions';
import { Twitter } from '../../lib/twitter';
import { Player } from '../referral/models/player.model';
import { Task, TaskType } from '../referral/models/task.model';
import { OauthTokenPair } from './models/oauth-token-pairs';

@Injectable()
export class OauthService {
  // public async unlink(context: Context) {
  //   await this.baseOauthService.unlink(context, OauthTokenTypes.TWITTER);
  //   const user = await new User().populateById(context.user.id);
  //   user.profile_image = null;
  //   try {
  //     await user.validate();
  //   } catch (err) {
  //     await user.handle(err);
  //     throw new ReferralValidationException(user);
  //   }
  //   await user.update();

  //   return user.serialize(SerializeFor.PROFILE);
  // }

  static async getTweets(_event: any, _context: ServiceContext) {
    const twitter = new Twitter();
    twitter.getTwitterApi();
    const res = await twitter.twitterApi.v2.userTimeline('1603025732598374403');
    console.log(res);
    return res;
  }

  /**
   * Link the twitter account to the user (Auth user). The oAuth credentials must received be from the authenticate (/oauth/twitter/authenticate).
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
      context.user.user_uiid,
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
