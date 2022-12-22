/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/naming-convention */
import { CodeException, Context, env, UserOAuthDto } from '@apillon/lib';
import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginResult, TwitterApi } from 'twitter-api-v2';
import { ReferralErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import { ReferralValidationException } from '../../lib/exceptions';
import { Player } from '../referral/models/player.model';
import { OauthTokenPair } from './models/oauth-token-pairs';

@Injectable()
export class TwitterService {
  private api: TwitterApi;

  /**
   * Returns Twitter client.
   *
   * https://developer.twitter.com/en/docs/authentication/guides/log-in-with-twitter
   *
   * The twitter login integration is uses a 2-legged oauth.
   * https://developer.twitter.com/en/docs/authentication/oauth-1-0a/obtaining-user-access-tokens
   *
   * 1. Fist the app must call the getTwitterAuthenticationLink, with the redirect url. The redirect url must be the same as the one set in the twitter app.
   *    Else the twitter api will return an error.
   * 2. The user will be redirected to the twitter app connect page. After the user has connected the app, the user will be redirected to the redirect url.
   * 3. The redirect url will contain the oauth_token and oauth_verifier. The oauth_token is the request token, and the oauth_verifier is the verifier.
   *    The verifier is used to get the access token. These pairs can be used only once.
   * 4. After the oauth_verifier is obtained, a link, or login method can be called.
   *    This will return the user profile, and the access token. The access token can be used to get the user profile.
   *    If the user is already linked, the user will be logged in.
   * For the register method, the user will be created. User name will be te same as the twitter user name.
   *
   * */

  /**
   * We separate API and client. The api is used to get the access token, and the client is used, when the access tokens are already present.
   */

  /**
   * Return details of the user directly from the twitter api. The oAuth credentials must received be from the authenticate (/oauth/twitter/authenticate).
   *
   * @param oAuthUser -- data from the twitter oAuth authenticate.
   * @returns details of the user
   */

  public async getTwitterDetails(oAuthUser: UserOAuthDto) {
    const pair = await new OauthTokenPair({}).populateByToken(
      oAuthUser.oauth_token,
    );
    const loggedTokens = await this.getLoginCredentials(
      oAuthUser,
      pair.oauth_secret,
    );
    return await this.getAccountDetails(loggedTokens);
  }

  /**
   * Link the twitter account to the user (Auth user). The oAuth credentials must received be from the authenticate (/oauth/twitter/authenticate).
   *
   * @param oAuthUser -- data from the twitter oAuth authenticate.
   * @param context -- the context
   * @returns created user details.
   */
  public async link(oAuthUserData: UserOAuthDto, context: ServiceContext) {
    // check if unlinked before linking
    const player = await new Player({}, context).populateByUserUuid(
      context.user.user_uiid,
    );
    const pair = await new OauthTokenPair({}, context).populateByToken(
      oAuthUserData.oauth_token,
    );
    const loggedTokens = await this.getLoginCredentials(
      oAuthUserData,
      pair.oauth_secret,
    );
    // const allTwitterData = await this.getAccountDetails(loggedTokens);

    if (!loggedTokens) {
      this.throwErrorCode(
        ReferralErrorCode.OAUTH_PROFILE_CREDENTIALS_INVALID,
        context,
      );
    }

    // check if oauth with the same account id exists
    const existingOauth = await new Player({}, context).populateByTwitterId(
      loggedTokens.userId,
    );

    if (existingOauth.exists()) {
      this.throwErrorCode(
        ReferralErrorCode.OAUTH_USER_ID_ALREADY_PRESENT,
        context,
      );
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
    return player.serialize();
  }

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

  public async getTwitterAuthenticationLink(redirect?: string) {
    let resp;
    try {
      resp = await this.getUserAuthenticateLink(redirect);
    } catch (e) {
      this.throwErrorCode(
        ReferralErrorCode.OAUTH_APP_DENIED_OR_SESSION_EXPIRED,
        null,
      );
      throw e;
    }
    const pair = await new OauthTokenPair().populateByToken(resp.oauth_token);
    pair.url = resp.url;
    if (!pair.exists()) {
      pair.oauth_token = resp.oauth_token;
      pair.oauth_secret = resp.oauth_token_secret;
      try {
        await pair.validate();
      } catch (err) {
        await pair.handle(err);
        throw new ReferralValidationException(pair);
      }
      return pair.insert();
    } else {
      pair.oauth_secret = resp.oauth_token_secret;
      try {
        await pair.validate();
      } catch (err) {
        await pair.handle(err);
        throw new ReferralValidationException(pair);
      }
      return pair.update();
    }
  }

  private getApi(): TwitterApi {
    if (!this.api) {
      this.api = new TwitterApi({
        appKey: env.TWITTER_CONSUMER_TOKEN,
        appSecret: env.TWITTER_CONSUMER_SECRET,
      });
      return this.api;
    }
  }

  private createClient(extras?: any): TwitterApi {
    return new TwitterApi({
      appKey: env.TWITTER_CONSUMER_TOKEN,
      appSecret: env.TWITTER_CONSUMER_SECRET,
      ...extras,
    });
  }

  private async getAccountDetails(loggedTokens: LoginResult) {
    try {
      const { data } = await loggedTokens.client.v2.me({
        'user.fields': ['profile_image_url'],
      });
      return {
        id: data.id,
        id_str: data.id.toString(),
        name: data.name,
        userName: data.username,
        image: data.profile_image_url,
      };
    } catch (err) {
      this.throwErrorCode(
        ReferralErrorCode.OAUTH_APP_DENIED_OR_SESSION_EXPIRED,
        null,
      );
    }
    return null;
  }

  /**
   * Get the twitter authentication link.
   */
  private async getUserAuthenticateLink(redirect?: string) {
    this.getApi();

    return await this.api.generateAuthLink(redirect, {
      linkMode: 'authenticate',
    });
  }

  /**
   * Get permanent access token for user.
   *
   * @param query - query params from the request.
   * @param pair - oauth token pair.
   * @returns
   */
  private async getLoginCredentials(
    query: {
      oauth_token;
      oauth_verifier;
    },
    oauth_secret,
  ): Promise<LoginResult> {
    const functionName = `${this.constructor.name}/getLoginCredentials`;
    if (!oauth_secret) {
      throw new UnauthorizedException(
        ReferralErrorCode[ReferralErrorCode.OAUTH_SECRET_MISSING],
        functionName,
      );
    }

    // Extract tokens from query string
    const { oauth_token, oauth_verifier } = query;

    // Get the saved oauth_token_secret from session

    if (!oauth_token || !oauth_verifier || !oauth_secret) {
      throw new UnauthorizedException(
        ReferralErrorCode[
          ReferralErrorCode.OAUTH_APP_DENIED_OR_SESSION_EXPIRED
        ],
        functionName,
      );
    }

    // Obtain the persistent tokens
    // Create a client from temporary tokens
    const client: TwitterApi = this.createClient({
      accessToken: oauth_token,
      accessSecret: oauth_secret,
    });
    try {
      return await client.login(oauth_verifier);
    } catch (e) {
      throw new UnauthorizedException(
        ReferralErrorCode[
          ReferralErrorCode.OAUTH_INVALID_VERIFIER_OR_ACCESS_TOKENS
        ],
        functionName,
      );
    }
  }

  private throwErrorCode(code: ReferralErrorCode, context: Context) {
    throw new CodeException({
      code: code,
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      context: context,
      sourceFunction: `${this.constructor.name}/twitter-oauth`,
    });
  }
}
