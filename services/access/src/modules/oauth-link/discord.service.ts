import {
  env,
  OauthLinkDiscordDto,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { AmsErrorCode, OauthLinkType } from '../../config/types';
import { ServiceContext } from '../../context';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { AuthUser } from '../auth-user/auth-user.model';
import { OauthLink } from './oauth-link.model';
import axios from 'axios';

export class DiscordService {
  public async link(event: OauthLinkDiscordDto, context: ServiceContext) {
    let existingOauthLink = await new OauthLink(
      {},
      context,
    ).populateByUserUuidAndType(context.user.user_uuid, OauthLinkType.DISCORD);

    // check if the current user already has a linked discord
    if (existingOauthLink.isActive()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.OAUTH_EXTERNAL_USER_ID_ALREADY_PRESENT,
      }).writeToMonitor({
        context,
        user_uuid: context?.user?.user_uuid,
        data: event,
      });
    }

    const discordProfile = await this.getDiscordProfile(event.code);

    if (!discordProfile) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.OAUTH_CREDENTIALS_INVALID,
      }).writeToMonitor({
        context,
        user_uuid: context?.user?.user_uuid,
        data: event,
      });
    }

    existingOauthLink = await new OauthLink(
      {},
      context,
    ).populateByExternalUserId(discordProfile.id, OauthLinkType.DISCORD);

    // check if the discord ID is already used by another user
    if (existingOauthLink.exists()) {
      existingOauthLink.status = SqlModelStatus.DELETED;
      await existingOauthLink.update();
    }

    // populate by user and OauthID
    let oauthLink = await new OauthLink({}, context).populateByUserUuidAndType(
      context.user.user_uuid,
      OauthLinkType.DISCORD,
      discordProfile.id,
    );

    if (!oauthLink.exists()) {
      const authUser = await new AuthUser({}, context).populateByUserUuid(
        context.user.user_uuid,
      );

      if (!authUser.exists()) {
        throw await new AmsCodeException({
          status: 400,
          code: AmsErrorCode.USER_DOES_NOT_EXISTS,
        }).writeToMonitor({
          context,
          user_uuid: context?.user?.user_uuid,
          data: event,
        });
      }

      oauthLink = new OauthLink({}, context);
      oauthLink.authUser_id = authUser.id;
      oauthLink.externalUserId = discordProfile.id;
      oauthLink.externalUsername = discordProfile.username;
      oauthLink.type = OauthLinkType.DISCORD;
      try {
        await oauthLink.validate();
      } catch (err) {
        await oauthLink.handle(err);
        throw new AmsValidationException(oauthLink);
      }
      await oauthLink.insert();
    }

    // reactivate user if it was deactivated
    if (oauthLink.status === SqlModelStatus.DELETED) {
      oauthLink.status = SqlModelStatus.ACTIVE;
      await oauthLink.update();
    }

    // await triggerSimpleQueue(env.AWS_DISCORD_SQS_URL);

    return oauthLink.serialize(SerializeFor.SERVICE);
  }

  public async unlink(context: ServiceContext) {
    const oauthLink = await new OauthLink(
      {},
      context,
    ).populateByUserUuidAndType(context.user.user_uuid, OauthLinkType.DISCORD);
    oauthLink.status = SqlModelStatus.DELETED;

    try {
      await oauthLink.validate();
    } catch (err) {
      await oauthLink.handle(err);
      throw new AmsValidationException(oauthLink);
    }
    await oauthLink.update();
    return { success: true };
  }

  //should we do this in conosle api ???
  async getDiscordProfile(code: string): Promise<any> {
    try {
      const options = new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: env.DISCORD_REDIRECT_URI,
        code,
      });
      const token = await axios.post(
        'https://discord.com/api/v10/oauth2/token',
        options,
      );

      if (token.data.access_token) {
        const res = await axios.get('https://discord.com/api/v10/users/@me', {
          headers: { Authorization: `Bearer ${token.data.access_token}` },
        });
        return res?.data;
      }
    } catch (error) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.OAUTH_SERVICE_CONNECTION_FAILED,
      }).writeToMonitor({
        data: error.message,
      });
    }
  }
  public async getDiscordAuthURL() {
    return {
      url: `https://discord.com/api/oauth2/authorize?client_id=${
        env.DISCORD_CLIENT_ID
      }&redirect_uri=${encodeURIComponent(
        env.DISCORD_REDIRECT_URI,
      )}&response_type=code&scope=identify%20email`,
    };
  }
}
