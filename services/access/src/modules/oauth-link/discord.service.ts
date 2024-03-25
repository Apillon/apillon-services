import {
  CreateOauthLinkDto,
  SerializeFor,
  SqlModelStatus,
  OauthListFilterDto,
  OauthLinkType,
  LogType,
} from '@apillon/lib';
import { AmsErrorCode, DbTables } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { AuthUser } from '../auth-user/auth-user.model';
import { OauthLink } from './oauth-link.model';

/**
 * OauthLinkService class for handling OAuth linking with Discord.
 */
export class OauthLinkService {
  /**
   * Link a user's account to their Discord account.
   * @param {CreateOauthLinkDto} event - The data needed to create an OAuth link.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<any>} - A serialized OAuth link for service response.
   */
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
          logType: LogType.WARN,
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

      await oauthLink.validateOrThrow(AmsValidationException);
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

  /**
   * Unlink a user's account from their Discord account.
   * @param {any} _event - The event data is not used, but left here for consistency.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<{ success: boolean }>} - An object with a success property.
   */
  public static async unlinkDiscord(_event: any, context: ServiceContext) {
    const oauthLink = await new OauthLink(
      {},
      context,
    ).populateByUserUuidAndType(context.user.user_uuid, OauthLinkType.DISCORD);
    oauthLink.status = SqlModelStatus.DELETED;

    await oauthLink.validateOrThrow(AmsValidationException);

    await oauthLink.update();
    return { success: true };
  }

  /**
   * Get a list of Discord users with linked accounts.
   * @param {OauthListFilterDto} event - The data to filter the list of Discord users.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<any[]>} - An array of Discord users with linked accounts.
   */
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

  /**
   * Get a list of a user's OAuth links.
   * @param {OauthListFilterDto} event - The data to filter the list of OAuth links.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<any[]>} - An array of OAuth links for a user.
   */
  public static async getUserOauthLinks(
    event: OauthListFilterDto,
    context: ServiceContext,
  ) {
    return OauthLinkService.getOauthLinks(event, context);
  }

  /**
   * Get a list of OAuth links with optional filtering by type.
   * @private
   * @param {OauthListFilterDto} event - The data to filter the list of OAuth links.
   * @param {ServiceContext} context - The service context for database access.
   * @param {OauthLinkType} type - Optional OAuth link type for filtering results.
   * @returns {Promise<any[]>} - An array of OAuth links matching the specified filters.
   */
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
