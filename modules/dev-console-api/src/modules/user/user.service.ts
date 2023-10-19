import {
  Ams,
  AppEnvironment,
  BadRequestErrorCode,
  CodeException,
  Context,
  CreateOauthLinkDto,
  JwtTokenType,
  Mailing,
  SerializeFor,
  UnauthorizedErrorCodes,
  UserWalletAuthDto,
  Scs,
  ValidationException,
  env,
  generateJwtToken,
  invalidateCachePrefixes,
  CacheKeyPrefix,
  checkCaptcha,
  parseJwtToken,
} from '@apillon/lib';
import { getDiscordProfile } from '@apillon/modules-lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { signatureVerify } from '@polkadot/util-crypto';
import { v4 as uuidV4 } from 'uuid';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { ProjectService } from '../project/project.service';
import { LoginUserKiltDto } from './dtos/login-user-kilt.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { RegisterUserDto } from './dtos/register-user.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ValidateEmailDto } from './dtos/validate-email.dto';
import { User } from './models/user.model';

import { registerUser } from './utils/authentication-utils';
import { getOauthSessionToken } from './utils/oauth-utils';
import { UserConsentDto, UserConsentStatus } from './dtos/user-consent.dto';
import { DiscordCodeDto } from './dtos/discord-code.dto';
@Injectable()
export class UserService {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * Retrieves the user profile information.
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @returns {Promise<any>} The serialized user profile data.
   */
  async getUserProfile(context: DevConsoleApiContext) {
    const user = await new User({}, context).populateById(context.user.id);

    if (!user.exists()) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ResourceNotFoundErrorCode.USER_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    user.userRoles = context.user.userRoles;
    user.userPermissions = context.user.userPermissions;
    user.wallet = context.user.authUser.wallet;

    return user.serialize(SerializeFor.PROFILE);
  }

  /**
   * Authenticates a user using email and password.
   * @param {LoginUserDto} loginInfo - The email and password data for login.
   * @param {DevConsoleApiContext} context - The API context for database access
   * @returns {Promise<any>} The serialized user profile data and token.
   */
  async login(
    loginInfo: LoginUserDto,
    context: DevConsoleApiContext,
  ): Promise<any> {
    const captchaJwt = await this.getCaptchaJwt(loginInfo);

    try {
      const { data: authUser } = await new Ams(context).login({
        email: loginInfo.email,
        password: loginInfo.password,
      });

      const user = await new User({}, context).populateByUUID(
        authUser.user_uuid,
      );

      if (!user.exists()) {
        throw new CodeException({
          status: HttpStatus.UNAUTHORIZED,
          code: ValidatorErrorCode.USER_INVALID_LOGIN,
          errorCodes: ValidatorErrorCode,
        });
      }

      user.wallet = authUser.wallet;

      user.setUserRolesAndPermissionsFromAmsResponse(authUser);

      return {
        ...user.serialize(SerializeFor.PROFILE),
        token: authUser.token,
        captchaJwt,
      };
    } catch (error) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ValidatorErrorCode.USER_INVALID_LOGIN,
        errorCodes: ValidatorErrorCode,
      });
    }
  }

  /**
   * Parses the USER_AUTHENTICATAION token, containing a verified email from the
   * Kilt verification process
   * @param {LoginUserKiltDto} loginInfo - The email and password data for login.
   * @param {DevConsoleApiContext} context - The API context for database access
   * @returns {Promise<any>} The serialized user profile data and token.
   */
  async loginWithKilt(
    loginInfo: LoginUserKiltDto,
    context: DevConsoleApiContext,
  ): Promise<any> {
    try {
      // Case 1: User EXISTS - authenticated and logged in using Access MS
      const resp = await new Ams(context).loginWithKilt({
        token: loginInfo.token,
      });

      const user = await new User({}, context).populateByUUID(
        resp.data.user_uuid,
      );

      if (!user.exists()) {
        throw new CodeException({
          status: HttpStatus.UNAUTHORIZED,
          code: ValidatorErrorCode.USER_INVALID_LOGIN,
          errorCodes: ValidatorErrorCode,
        });
      }

      user.wallet = resp.data.wallet;
      user.setUserRolesAndPermissionsFromAmsResponse(resp);

      return {
        ...user.serialize(SerializeFor.PROFILE),
        token: resp.data.token,
      };
    } catch (error) {
      if (error.code != 40102100) {
        throw new CodeException({
          status: HttpStatus.UNAUTHORIZED,
          code: ValidatorErrorCode.USER_INVALID_LOGIN,
          errorCodes: ValidatorErrorCode,
        });
      }
    }

    // CASE 2 User does NOT EXIST - Access MS did not find it.
    // ==> Create new user with random passowrd
    const params = {
      token: loginInfo.token,
      password: uuidV4(),
      projectService: this.projectService,
      tokenType: JwtTokenType.OAUTH_TOKEN,
    };

    return registerUser(params, context);
  }

  /**
   * Validates the email for the user registration process.
   * @param {Context} context - The API context
   * @param {ValidateEmailDto} emailVal - The email data.
   * @returns {Promise<any>} The email validation result.
   */
  async validateEmail(
    context: Context,
    emailVal: ValidateEmailDto,
  ): Promise<any> {
    const { email, refCode } = emailVal;

    const { data: emailResult } = await new Ams(context).emailExists(
      emailVal.email,
    );

    if (emailResult.result === true) {
      throw new CodeException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ValidatorErrorCode.USER_EMAIL_ALREADY_TAKEN,
        errorCodes: ValidatorErrorCode,
      });
    }

    const token = generateJwtToken(
      JwtTokenType.USER_CONFIRM_EMAIL,
      {
        email,
      },
      '1h',
    );

    await new Mailing(context).sendMail({
      emails: [email],
      template: 'welcome',
      data: {
        actionUrl: `${env.APP_URL}/register/confirmed/?token=${token}${
          refCode ? `&REF=${refCode}` : ''
        }`,
      },
    });

    return emailResult;
  }

  /**
   * Registers a new user.
   * @param {RegisterUserDto} data - The registration data including email and password.
   * @param {DevConsoleApiContext} context - The API context
   * @returns {Promise<any>} The serialized user profile data and token.
   */
  async registerUser(
    data: RegisterUserDto,
    context: DevConsoleApiContext,
  ): Promise<any> {
    const params = {
      ...data,
      projectService: this.projectService,
      tokenType: JwtTokenType.USER_CONFIRM_EMAIL,
    };
    return registerUser(params, context);
  }

  /**
   * Generates an auth message with a timestamp for wallet login.
   * @param {number} [timestamp] - The timestamp for the message. Default is the current time.
   * @returns {object} The auth message and timestamp.
   */
  public getAuthMessage(timestamp: number = new Date().getTime()) {
    return {
      message: `Please sign this message.\n${timestamp}`,
      timestamp,
    };
  }

  /**
   * Authenticates a user using wallet signature.
   * @param {UserWalletAuthDto} userAuth - The wallet authentication data.
   * @param {Context} context - The API context with current user session.
   * @returns {Promise<any>} The serialized user profile data and token.
   */
  async walletLogin(userAuth: UserWalletAuthDto, context: Context) {
    // 1 hour validity
    if (new Date().getTime() - userAuth.timestamp > 60 * 60 * 1000) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: UnauthorizedErrorCodes.INVALID_SIGNATURE,
        sourceFunction: `${this.constructor.name}/walletLogin`,
        errorCodes: UnauthorizedErrorCodes,
        context,
      });
    }

    const { message } = this.getAuthMessage(userAuth.timestamp);
    const resp = await new Ams(context).loginWithWallet(userAuth, message);
    const user = await new User({}, context).populateByUUID(
      resp.data.user_uuid,
    );

    if (!user.exists()) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ValidatorErrorCode.USER_INVALID_LOGIN,
        errorCodes: ValidatorErrorCode,
      });
    }

    user.setUserRolesAndPermissionsFromAmsResponse(resp);

    user.wallet = resp.data.wallet;

    return {
      ...user.serialize(SerializeFor.PROFILE),
      token: resp.data.token,
    };
  }

  /**
   * Connects a wallet to the user profile.
   * @param {UserWalletAuthDto} userAuth - The wallet authentication data.
   * @param {Context} context - The API context with current user session.
   * @returns {Promise<any>} The serialized user profile data.
   */
  async walletConnect(userAuth: UserWalletAuthDto, context: Context) {
    // 1 hour validity
    if (new Date().getTime() - userAuth.timestamp > 60 * 60 * 1000) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: UnauthorizedErrorCodes.INVALID_SIGNATURE,
        sourceFunction: `${this.constructor.name}/walletConnect`,
        context,
      });
    }

    const { message } = this.getAuthMessage(userAuth.timestamp);
    const { isValid } = signatureVerify(
      message,
      userAuth.signature,
      userAuth.wallet,
    );

    if (!isValid) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: UnauthorizedErrorCodes.INVALID_SIGNATURE,
        sourceFunction: `${this.constructor.name}/walletConnect`,
        context,
      });
    }

    const resp = await new Ams(context).updateAuthUser({
      user_uuid: context.user.user_uuid,
      wallet: userAuth.wallet,
    });

    context.user.populate(resp.data);

    return context.user.serialize(SerializeFor.PROFILE);
  }

  /**
   * Initiates the password reset process by sending an email with a token.
   * @param {Context} context - The API context with current user session.
   * @param {ValidateEmailDto} body - The email data.
   * @returns {Promise<boolean>} True if the email was sent successfully.
   */
  async passwordResetRequest(context: Context, { email }: ValidateEmailDto) {
    const { data: emailResult } = await new Ams(context).emailExists(email);

    if (emailResult.result !== true) {
      // for security reason do not return error to FE
      return true;
    }

    const token = generateJwtToken(
      JwtTokenType.USER_RESET_PASSWORD,
      {
        email,
      },
      '1h',
      emailResult.authUser.password ? emailResult.authUser.password : undefined,
    );

    await new Mailing(context).sendMail({
      emails: [email],
      // subject: 'Apillon password reset',
      template: 'reset-password',
      data: {
        actionUrl: `${env.APP_URL}/register/reset-password/?token=${token}`,
      },
    });

    return true;
  }

  /**
   * Resets the user password using the provided token and new password.
   * @param {Context} context - The API context with current user session.
   * @param {ResetPasswordDto} body - The token and new password data.
   * @returns {Promise<boolean>} True if the password was reset successfully.
   */
  async resetPassword(context: Context, body: ResetPasswordDto) {
    await new Ams(context).resetPassword({
      token: body.token,
      password: body.password,
    });

    return true;
  }

  /**
   * Updates the user profile information.
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @param {UpdateUserDto} body - The updated user data.
   * @returns {Promise<any>} The serialized updated user profile data.
   */
  async updateUserProfile(context: DevConsoleApiContext, body: UpdateUserDto) {
    const user = await new User({}, context).populateById(context.user.id);

    if (!user.exists()) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ResourceNotFoundErrorCode.USER_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    user.populate(body);
    try {
      await user.validate();
    } catch (err) {
      await user.handle(err);
      if (!user.isValid()) {
        throw new ValidationException(user, ValidatorErrorCode);
      }
    }

    const conn = await context.mysql.start();

    try {
      await user.update(SerializeFor.UPDATE_DB, conn);
      await context.mysql.commit(conn);

      await invalidateCachePrefixes([CacheKeyPrefix.ADMIN_USER_LIST]);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }

    return user;
  }

  /**
   * Connects the user's Discord account to their profile.
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @param {string} code - The Discord OAuth code.
   * @returns {Promise<any>} The serialized updated user profile data.
   */
  async connectDiscord(context: DevConsoleApiContext, body: DiscordCodeDto) {
    let discordProfile: any;
    if (env.APP_ENV === AppEnvironment.TEST) {
      const testId = body.code;
      discordProfile = {
        id: testId,
        username: `TestUser${testId}`,
      };
    } else {
      discordProfile = await getDiscordProfile(body.code);
    }

    if (!discordProfile) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: BadRequestErrorCode.THIRD_PARTY_SERVICE_CONNECTION_FAILED,
        errorCodes: BadRequestErrorCode,
      });
    }

    const payload = new CreateOauthLinkDto({
      externalUserId: discordProfile.id,
      externalUsername: discordProfile.username,
    });

    return await new Ams(context).linkDiscord(payload);
  }

  /**
   * Disconnects the user's Discord account from their profile.
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @returns {Promise<any>} The serialized updated user profile data.
   */
  async disconnectDiscord(context: DevConsoleApiContext) {
    await new Ams(context).unlinkDiscord();
  }

  /**
   * Get connection info for users connected OAuth providers.
   * @param context - The API context with current user session.
   * @returns User oauth links info.
   */
  async getOauthLinks(context: DevConsoleApiContext) {
    return await new Ams(context).getOauthLinks(context.user.user_uuid);
  }

  /**
   * Get terms that user needs to review and accept
   * @param context - The API context with current user session.
   * @returns new terms for user
   */
  async getPendingTermsForUser(context: DevConsoleApiContext) {
    const terms = await new Scs(context).getActiveTerms();
    const resp = terms.filter((x) => {
      return !context.user?.authUser?.consents?.terms.find((c) => c.id == x.id);
    });

    console.log(resp);
    return resp;
  }

  async setUserConsents(body: Array<any>, context: DevConsoleApiContext) {
    const activeTerms = await new Scs(context).getActiveTerms();
    const consents = [];
    for (const data of body) {
      const consent = new UserConsentDto(data);

      consent.dateOfAgreement =
        consent.status === UserConsentStatus.ACCEPTED ? new Date() : null;
      try {
        await consent.validate();
      } catch (err) {
        await consent.handle(err);
        if (!consent.isValid()) {
          throw new ValidationException(consent, ValidatorErrorCode);
        }
      }
      const term = activeTerms.find(
        (x) => x.id == consent.id && x.type == consent.type,
      );
      if (!term) {
        throw new CodeException({
          status: HttpStatus.BAD_REQUEST,
          code: BadRequestErrorCode.RESOURCE_DOES_NOT_EXISTS,
          errorCodes: BadRequestErrorCode,
        });
      }
      if (!!term.isRequired && consent.status !== UserConsentStatus.ACCEPTED) {
        throw new CodeException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ValidatorErrorCode.USER_CONSENT_IS_REQUIRED,
          errorCodes: ValidatorErrorCode,
        });
      }
      consents.push(consent.serialize());
    }

    await new Ams(context).updateAuthUser({
      user_uuid: context.user.user_uuid,
      consents: { terms: consents },
    });
  }

  /**
   * Get session token for the oauth module
   * @param context - The API context with current user session.
   * @returns Session info for the oauth module
   */
  async getOauthSession() {
    return (
      await getOauthSessionToken(
        env.APILLON_API_SYSTEM_API_KEY,
        env.APILLON_API_SYSTEM_API_SECRET,
      )
    ).data;
  }

  /**
   * Check if there is a valid captcha JWT token. If not, demand that the captcha is solved successfully.
   * After solving the captcha, a jwt token which lasts for env.CAPTCHA_REMEMBER_DAYS is generated and sent to the client
   * @param {LoginUserDto} loginInfo - User's login info sent from the client
   */
  async getCaptchaJwt(loginInfo: LoginUserDto) {
    const captchaJwt = loginInfo.captchaJwt;
    try {
      parseJwtToken(JwtTokenType.USER_LOGIN_CAPTCHA, captchaJwt);
    } catch (error) {
      if (env.LOGIN_CAPTCHA_ENABLED) {
        // If there is no valid JWT token, request captcha solve
        await checkCaptcha(loginInfo.captcha?.token);
      }
      return generateJwtToken(
        JwtTokenType.USER_LOGIN_CAPTCHA,
        { email: loginInfo.email },
        `${env.CAPTCHA_REMEMBER_DAYS}d`,
      );
    }
    return captchaJwt;
  }
}
