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
  ModelValidationException,
  env,
  generateJwtToken,
  invalidateCachePrefixes,
  CacheKeyPrefix,
  checkCaptcha,
  parseJwtToken,
  EmailDataDto,
  EmailTemplate,
  LogType,
  JwtExpireTime,
} from '@apillon/lib';
import { getDiscordProfile } from '@apillon/modules-lib';
import { HttpStatus, Injectable } from '@nestjs/common';
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
import { DiscordCodeDto } from './dtos/discord-code.dto';
import { Identity } from '@apillon/sdk';
import axios from 'axios';
import { ServiceContext } from '@apillon/service-lib';

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
    user.evmWallet = context.user.authUser.evmWallet;

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

      user.setUserRolesAndPermissionsFromAmsResponse(authUser);
      user.setWalletsFromAmsResponse(authUser);

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

      user.setUserRolesAndPermissionsFromAmsResponse(resp);
      user.setWalletsFromAmsResponse(resp);

      return {
        ...user.serialize(SerializeFor.PROFILE),
        token: resp.data.token,
      };
    } catch (error) {
      // If not error USER_IS_NOT_AUTHENTICATED, meaning some other error occurred
      if (error.code != 401021000) {
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

    return registerUser(params as any, context);
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
    const { email, refCode, metadata } = emailVal;

    // Validate email to prevent header injection attacks
    if (/%0d|%0a|\\r|\\n/i.test(email)) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: ValidatorErrorCode.USER_EMAIL_NOT_VALID,
        errorCodes: ValidatorErrorCode,
      });
    }

    const { data: emailResult } = await new Ams(context).emailExists(
      emailVal.email,
    );

    if (emailResult.result === true) {
      // for security reason do not return error to FE
      return true;
    }

    // If user has registered with wallet, validate the signature and use it in signup email jwt
    let wallet = emailVal.wallet;
    if (wallet) {
      const { address } = await this.validateWalletSignature(
        emailVal,
        'UserService/walletConnect',
        context,
      );
      wallet = address;
    }

    const token = generateJwtToken(
      JwtTokenType.USER_CONFIRM_EMAIL,
      { email, refCode, metadata, wallet },
      JwtExpireTime.ONE_HOUR,
    );

    await new Mailing(context).sendMail(
      new EmailDataDto({
        mailAddresses: [email],
        templateName: EmailTemplate.WELCOME,
        templateData: {
          actionUrl: `${env.APP_URL}/register/confirmed?token=${token}${
            wallet ? `&walletLogin=true` : ''
          }`,
        },
      }),
    );

    return true;
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
    return registerUser(params as any, context);
  }

  /**
   * Authenticates a user using wallet signature.
   * @param {UserWalletAuthDto} userAuth - The wallet authentication data.
   * @param {Context} context - The API context with current user session.
   * @returns {Promise<any>} The serialized user profile data and token.
   */
  async loginWithWallet(userAuth: UserWalletAuthDto, context: Context) {
    await this.validateWalletSignature(
      userAuth,
      'UserService/loginWithWallet',
      context,
    );

    const { data } = await new Ams(context).loginWithWallet(userAuth);
    const user = await new User({}, context).populateByUUID(data.user_uuid);

    if (!user.exists()) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ValidatorErrorCode.USER_INVALID_LOGIN,
        errorCodes: ValidatorErrorCode,
      });
    }

    user.setUserRolesAndPermissionsFromAmsResponse(data);
    user.setWalletsFromAmsResponse(data);

    return {
      ...user.serialize(SerializeFor.PROFILE),
      token: data.token,
    };
  }

  /**
   * Connects a wallet to the user profile.
   * @param {UserWalletAuthDto} userAuth - The wallet authentication data.
   * @param {Context} context - The API context with current user session.
   * @returns {Promise<any>} The serialized user profile data.
   */
  async walletConnect(userAuth: UserWalletAuthDto, context: Context) {
    const { wallet, isEvmWallet } = userAuth;

    // Wallet is null if user has disconnected wallet, do not check signature
    if (wallet !== null) {
      await this.validateWalletSignature(
        userAuth,
        'UserService/walletConnect',
        context,
      );
    }

    const resp = await new Ams(context).updateAuthUser({
      user_uuid: context.user.user_uuid,
      [isEvmWallet ? 'evmWallet' : 'wallet']: wallet,
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
      { email },
      JwtExpireTime.TEN_MINUTES,
      emailResult.authUser.password ? emailResult.authUser.password : undefined,
    );

    await new Mailing(context).sendMail(
      new EmailDataDto({
        mailAddresses: [email],
        templateName: EmailTemplate.RESET_PASSWORD,
        templateData: {
          actionUrl: `${env.APP_URL}/register/reset-password/?token=${token}`,
        },
      }),
    );

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
    await user.validateOrThrow(ModelValidationException, ValidatorErrorCode);

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
   * Get session token for the oauth module
   * @param context - The API context with current user session.
   * @returns Session info for the oauth module
   */
  async getOauthSession() {
    const { data } = await axios.get(
      `${env.APILLON_API_URL}/auth/session-token`,
      {
        auth: {
          username: env.APILLON_API_INTEGRATION_API_KEY,
          password: env.APILLON_API_INTEGRATION_API_SECRET,
        },
      },
    );
    return data.data;
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
        `${env.CAPTCHA_REMEMBER_DAYS}d` as JwtExpireTime,
      );
    }
    return captchaJwt;
  }

  /**
   * Validate a wallet signature for a given address and timestamp
   * @param {UserWalletAuthDto} walletAuthDto
   * @param {string} sourceFunction - Used for logging in case of an error
   * @param {ServiceContext} context
   */
  async validateWalletSignature(
    walletAuthDto: UserWalletAuthDto,
    sourceFunction: string,
    context: ServiceContext,
    message?: string,
  ) {
    const { isEvmWallet, wallet, signature, timestamp } = walletAuthDto;
    message ||= this.getAuthMessage(timestamp).message;
    const signatureValidityMinutes = 15;

    const getSignatureData = isEvmWallet
      ? new Identity(null).validateEvmWalletSignature
      : new Identity(null).validatePolkadotWalletSignature;

    try {
      const signatureData = getSignatureData({
        message,
        signature,
        walletAddress: wallet,
        timestamp,
        signatureValidityMinutes,
      });
      if (!signatureData.isValid) {
        throw new Error('Signature is invalid.');
      }
      return signatureData;
    } catch (err) {
      throw await new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: UnauthorizedErrorCodes.INVALID_SIGNATURE,
        sourceFunction,
        errorCodes: UnauthorizedErrorCodes,
        context,
        errorMessage: err.message,
      }).writeToMonitor({
        logType: LogType.WARN,
        context,
        user_uuid: context?.user?.user_uuid,
        data: {
          walletAuthDto: walletAuthDto.serialize(),
          err,
        },
      });
    }
  }

  /**
   * Generates an auth message with a timestamp for wallet login.
   * @param {number} [timestamp] - The timestamp for the message. Default is the current time.
   * @returns {object} The auth message and timestamp.
   */
  getAuthMessage(timestamp: number = new Date().getTime()) {
    return {
      message: `Please sign this message.\n${timestamp}`,
      timestamp,
    };
  }
}
