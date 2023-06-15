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
  ValidationException,
  env,
  generateJwtToken,
} from '@apillon/lib';
import { getDiscordProfile, verifyCaptcha } from '@apillon/modules-lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { signatureVerify } from '@polkadot/util-crypto';
import { v4 as uuidV4 } from 'uuid';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { ProjectService } from '../project/project.service';
import { DiscordCodeDto } from './dtos/discord-code-dto';
import { LoginUserKiltDto } from './dtos/login-user-kilt.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { RegisterUserDto } from './dtos/register-user.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ValidateEmailDto } from './dtos/validate-email.dto';
import { User } from './models/user.model';

import { registerUser } from './utils/authentication-utils';
import { getOauthSessionToken } from './utils/oauth-utils';

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

    if (!user.exists) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ResourceNotFoundErrorCode.USER_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    user.userRoles = context.user.userRoles;
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
    try {
      const resp = await new Ams(context).login({
        email: loginInfo.email,
        password: loginInfo.password,
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

      user.setUserRolesFromAmsResponse(resp);

      return {
        ...user.serialize(SerializeFor.PROFILE),
        token: resp.data.token,
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
      user.setUserRolesFromAmsResponse(resp);

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
      tokenType: JwtTokenType.USER_AUTHENTICATION,
    };

    return registerUser(params, context);
  }

  /**
   * Validates the email and captcha for the user registration process.
   * @param {Context} context - The API context
   * @param {ValidateEmailDto} emailVal - The email and captcha data.
   * @returns {Promise<any>} The email validation result.
   */
  async validateEmail(
    context: Context,
    emailVal: ValidateEmailDto,
  ): Promise<any> {
    const { email, captcha, refCode } = emailVal;
    let emailResult;
    let captchaResult;
    // console.log(captcha);

    const promises = [];
    promises.push(
      new Ams(context)
        .emailExists(email)
        .then((response) => (emailResult = response)),
    );
    if (env.CAPTCHA_SECRET && env.APP_ENV !== AppEnvironment.TEST) {
      promises.push(
        verifyCaptcha(captcha?.token, env.CAPTCHA_SECRET).then(
          (response) => (captchaResult = response),
        ),
      );
    } /*else {
      throw new CodeException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ValidatorErrorCode.CAPTCHA_NOT_PRESENT,
        errorCodes: ValidatorErrorCode,
      });
    }*/

    await Promise.all(promises);

    if (
      env.CAPTCHA_SECRET &&
      env.APP_ENV !== AppEnvironment.TEST &&
      !captchaResult
    ) {
      throw new CodeException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ValidatorErrorCode.CAPTCHA_CHALLENGE_INVALID,
        errorCodes: ValidatorErrorCode,
      });
    }

    if (emailResult.data.result === true) {
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
          refCode ? '&REF=' + refCode : ''
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

    user.setUserRolesFromAmsResponse(resp);

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
  async passwordResetRequest(context: Context, body: ValidateEmailDto) {
    const { email, captcha } = body;
    let emailResult;
    let captchaResult;

    const promises = [];
    promises.push(
      new Ams(context)
        .emailExists(email)
        .then((response) => (emailResult = response)),
    );
    if (env.CAPTCHA_SECRET && env.APP_ENV !== AppEnvironment.TEST) {
      promises.push(
        verifyCaptcha(captcha?.token, env.CAPTCHA_SECRET).then(
          (response) => (captchaResult = response),
        ),
      );
    } /*else {
      throw new CodeException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ValidatorErrorCode.CAPTCHA_NOT_PRESENT,
        errorCodes: ValidatorErrorCode,
      });
    }*/

    await Promise.all(promises);

    if (
      env.CAPTCHA_SECRET &&
      env.APP_ENV !== AppEnvironment.TEST &&
      !captchaResult
    ) {
      throw new CodeException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ValidatorErrorCode.CAPTCHA_CHALLENGE_INVALID,
        errorCodes: ValidatorErrorCode,
      });
    }

    if (emailResult.data.result !== true) {
      // for security reason do not return error to FE
      return true;
    }

    const token = generateJwtToken(
      JwtTokenType.USER_RESET_PASSWORD,
      {
        email: email,
      },
      '1h',
      emailResult.data.authUser.password
        ? emailResult.data.authUser.password
        : undefined,
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

    if (!user.exists) {
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
   * Get session token for the oauth module
   * @param context - The API context with current user session.
   * @returns Session info for the oauth module
   */
  async getOauthSession() {
    return await getOauthSessionToken(
      env.APILLON_API_SYSTEM_API_KEY,
      env.APILLON_API_SYSTEM_API_SECRET,
    );
  }
}
