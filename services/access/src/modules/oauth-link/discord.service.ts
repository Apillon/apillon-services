import {
  CreateOauthLinkDto,
  SerializeFor,
  SqlModelStatus,
  OauthListFilterDto,
  OauthLinkType,
} from '@apillon/lib';
import { AmsErrorCode, DbTables } from '../../config/types';
import { ServiceContext } from '../../context';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { AuthUser } from '../auth-user/auth-user.model';
import { OauthLink } from './oauth-link.model';

export class OauthLinkService {
  public static async linkDiscord(
    event: CreateOauthLinkDto,
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
    ).populateByExternalUserId(event.externalUserId, OauthLinkType.DISCORD);

    // check if the discord ID is already used by another user
    if (existingOauthLink.exists()) {
      existingOauthLink.status = SqlModelStatus.DELETED;
      await existingOauthLink.update();
    }

    // populate by user and OauthID
    let oauthLink = await new OauthLink({}, context).populateByUserUuidAndType(
      context.user.user_uuid,
      OauthLinkType.DISCORD,
      event.externalUserId,
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
      oauthLink.externalUserId = event.externalUserId;
      oauthLink.externalUsername = event.externalUsername;
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

  public static async unlinkDiscord(_event: any, context: ServiceContext) {
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
    event: OauthListFilterDto,
    context: ServiceContext,
  ) {
    delete event.user_uuid;
    return OauthLinkService.getOauthLinks(
      event,
      context,
      OauthLinkType.DISCORD,
    );
  }

  public static async getUserOauthLinks(
    event: OauthListFilterDto,
    context: ServiceContext,
  ) {
    return OauthLinkService.getOauthLinks(event, context);
  }

  private static async getOauthLinks(
    event: OauthListFilterDto,
    context: ServiceContext,
    type: OauthLinkType = null,
  ) {
    const resp = await context.mysql.paramExecute(
      `
      SELECT 
        au.user_uuid,
        au.email, 
        ol.type,
        ol.externalUserId,
        ol.externalUsername,
        ol.createTime
      FROM ${DbTables.OAUTH_LINK} ol
      JOIN ${DbTables.AUTH_USER} au
        ON au.id = ol.authUser_id
      WHERE 
        ol.status = ${SqlModelStatus.ACTIVE}
        AND (@type IS NULL OR ol.type = @type)
        AND (@dateFrom IS NULL OR ol.createTime >= @dateFrom)
        AND (@dateTo IS NULL OR ol.createTime < @dateTo)
        AND (@search IS NULL OR ol.externalUsername LIKE @search OR au.email LIKE @search)
        AND (@user_uuid IS NULL OR au.user_uuid = @user_uuid)
    `,
      {
        dateFrom: event?.dateFrom || null,
        dateTo: event?.dateTo || null,
        search: event?.search ? `${event.search}%` : null,
        user_uuid: event?.user_uuid || null,
        type,
      },
    );

    if (!resp.length) {
      return [];
    }

    return resp;
  }
}
