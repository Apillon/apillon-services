import {
  CreateReferralDto,
  env,
  GithubOauthDto,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { ServiceContext } from '../../context';
import {
  ReferralCodeException,
  ReferralValidationException,
} from '../../lib/exceptions';
import { Player } from './models/player.model';
import { ReferralErrorCode } from '../../config/types';
import axios, { HttpStatusCode } from 'axios';
import { Task } from './models/task.model';

export class ReferralService {
  static async createReferral(
    event: { body: CreateReferralDto },
    context: ServiceContext,
  ): Promise<any> {
    const user_uuid = event.body?.user_uuid || context?.user?.user_uuid;
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
        referral_id: referrer?.id,
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

  static async getReferral(context: ServiceContext): Promise<any> {
    const player: Player = await new Player({}, context).populateByUserUuid(
      context?.user?.user_uuid,
    );

    // Player does not exist
    if (!player.id || player.status === SqlModelStatus.DELETED) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatusCode.BadRequest,
      });
    }

    // Missing accepted terms
    if (!player.termsAccepted || player.status === SqlModelStatus.INCOMPLETE) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatusCode.BadRequest,
      });
    }

    await player.populateTasks();

    return player.serialize(SerializeFor.PROFILE);
  }

  static async connectGithub(
    event: { body: GithubOauthDto },
    context: ServiceContext,
  ): Promise<any> {
    const player: Player = await new Player({}, context).populateByUserUuid(
      context?.user?.user_uuid,
    );
    if (!player.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatusCode.BadRequest,
      });
    }

    const task: Task = await new Task({}, context).populateById(
      event.body.task_id,
    );
    if (!task.exists()) {
      throw new ReferralCodeException({
        code: ReferralErrorCode.DEFAULT_BAD_REQUEST_EROR,
        status: HttpStatusCode.BadRequest,
      });
    }

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
        await player.update();
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
        // error
      }
    } else {
      // error
    }

    return player.serialize(SerializeFor.PROFILE);
  }
}
