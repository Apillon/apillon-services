import {
  CreateOauthLinkDto,
  SerializeFor,
  SqlModelStatus,
  DiscordUserListFilterDto,
} from '@apillon/lib';
import { AmsErrorCode, DbTables, OauthLinkType } from '../../config/types';
import { ServiceContext } from '../../context';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { AuthUser } from '../auth-user/auth-user.model';
import { OauthLink } from './oauth-link.model';

export class DiscordService {
  public static async link(
    discordProfile: CreateOauthLinkDto,
    context: ServiceContext,
  ) {
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

    existingOauthLink = await new OauthLink(
      {},
      context,
    ).populateByExternalUserId(
      discordProfile.externalUserId,
      OauthLinkType.DISCORD,
    );

    // check if the discord ID is already used by another user
    if (existingOauthLink.exists()) {
      existingOauthLink.status = SqlModelStatus.DELETED;
      await existingOauthLink.update();
    }

    // populate by user and OauthID
    let oauthLink = await new OauthLink({}, context).populateByUserUuidAndType(
      context.user.user_uuid,
      OauthLinkType.DISCORD,
      discordProfile.externalUserId,
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
      oauthLink.externalUserId = discordProfile.externalUserId;
      oauthLink.externalUsername = discordProfile.externalUsername;
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

  public static async unlink(context: ServiceContext) {
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

  public static async getDiscordUserList(
    event: DiscordUserListFilterDto,
    context: ServiceContext,
  ) {
    const resp = await context.mysql.paramExecute(
      `
      SELECT 
        au.user_uuid,
        au.email, 
        ol.externalUserId,
        ol.externalUsername,
        ol.createTime
      FROM ${DbTables.OAUTH_LINK} ol
      JOIN ${DbTables.AUTH_USER} au
        ON au.id = ol.authUser_id
      WHERE 
        ol.status = ${SqlModelStatus.ACTIVE}
        AND ol.type = ${OauthLinkType.DISCORD}
        AND (@dateFrom IS NULL OR ol.createTime >= @dateFrom)
        AND (@dateTo IS NULL OR ol.createTime < @dateTo)
        AND (@search IS NULL OR ol.externalUsername LIKE @search OR au.email LIKE @search)
    `,
      {
        dateFrom: event?.dateFrom || null,
        dateTo: event?.dateTo || null,
        search: event?.search ? `${event.search}%` : null,
      },
    );

    if (!resp.length) {
      return [];
    }

    return resp;
  }
}
