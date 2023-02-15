import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Ams,
  AppEnvironment,
  CodeException,
  Context,
  CreateReferralDto,
  env,
  generateJwtToken,
  JwtTokenType,
  LogType,
  Mailing,
  parseJwtToken,
  ReferralMicroservice,
  SerializeFor,
  UnauthorizedErrorCodes,
  ValidationException,
  writeLog,
} from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { ProjectService } from '../project/project.service';
import { LoginUserDto } from './dtos/login-user.dto';
import { RegisterUserDto } from './dtos/register-user.dto';
import { ValidateEmailDto } from './dtos/validate-email.dto';
import { User } from './models/user.model';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { verifyCaptcha } from '@apillon/modules-lib';

@Injectable()
export class UserService {
  constructor(private readonly projectService: ProjectService) {}

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

    return user.serialize(SerializeFor.PROFILE);
  }

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

      user.userRoles =
        resp.data.authUserRoles
          ?.filter((x) => !x.project_uuid)
          ?.map((x) => x.role_id) || [];

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
    } else {
      throw new CodeException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ValidatorErrorCode.CAPTCHA_NOT_PRESENT,
        errorCodes: ValidatorErrorCode,
      });
    }

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

    const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, {
      email,
    });

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

  async registerUser(
    data: RegisterUserDto,
    context: DevConsoleApiContext,
  ): Promise<any> {
    const { token, password } = data;

    const tokenData = parseJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, token);

    if (!tokenData?.email) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: UnauthorizedErrorCodes.INVALID_TOKEN,
        errorCodes: UnauthorizedErrorCodes,
      });
    }

    const email = tokenData.email;

    const user: User = new User({}, context).populate({
      user_uuid: uuidV4(),
      email: tokenData.email,
    });

    try {
      await user.validate();
    } catch (err) {
      await user.handle(err);
      if (!user.isValid())
        throw new ValidationException(user, ValidatorErrorCode);
    }

    const conn = await context.mysql.start();
    let amsResponse;
    try {
      await user.insert(SerializeFor.INSERT_DB, conn);
      amsResponse = await new Ams(context).register({
        user_uuid: user.user_uuid,
        email,
        password,
      });

      await context.mysql.commit(conn);
    } catch (err) {
      // TODO: The context of this error is not correct. What happens if
      //       ams fails? FE will see it as a DB write error, which is incorrect.
      await context.mysql.rollback(conn);
      throw err;
    }
    try {
      // Create referral player - is inactive until accepts terms
      const referralBody = new CreateReferralDto(
        {
          refCode: data?.refCode,
        },
        context,
      );

      await new ReferralMicroservice({
        ...context,
        user,
      } as any).createPlayer(referralBody);
    } catch (err) {
      writeLog(
        LogType.MSG,
        `Error creating referral player${
          data?.refCode ? ', refCode: ' + data?.refCode : ''
        }`,
        'user.service.ts',
        'register',
        err,
      );
    }

    //User has been registered - check if pending invitations for project exists
    //This is done outside transaction as it is not crucial operation - admin is able to reinvite user to project
    try {
      if (tokenData.hasPendingInvitation) {
        await this.projectService.resolveProjectUserPendingInvitations(
          context,
          email,
          user.id,
          user.user_uuid,
        );
      }
    } catch (err) {
      writeLog(
        LogType.MSG,
        'Error resolving project user pending invitations',
        'user.service.ts',
        'register',
        err,
      );
    }

    return {
      ...user.serialize(SerializeFor.PROFILE),
      token: amsResponse.data.token,
    };
  }

  async passwordResetRequest(context: Context, body: ValidateEmailDto) {
    const res = await new Ams(context).emailExists(body.email);

    if (!res.data.result) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.USER_EMAIL_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    const token = generateJwtToken(JwtTokenType.USER_RESET_PASSWORD, {
      email: body.email,
    });

    await new Mailing(context).sendMail({
      emails: [body.email],
      // subject: 'Apillon password reset',
      template: 'reset-password',
      data: {
        actionUrl: `${env.APP_URL}/register/reset-password/?token=${token}`,
      },
    });

    return true;
  }

  async resetPassword(context: Context, body: ResetPasswordDto) {
    const tokenData = parseJwtToken(
      JwtTokenType.USER_RESET_PASSWORD,
      body.token,
    );

    if (!tokenData?.email) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: UnauthorizedErrorCodes.INVALID_TOKEN,
        errorCodes: UnauthorizedErrorCodes,
      });
    }

    await new Ams(context).resetPassword({
      email: tokenData.email,
      password: body.password,
    });

    return true;
  }

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
      if (!user.isValid())
        throw new ValidationException(user, ValidatorErrorCode);
    }

    const conn = await context.mysql.start();

    try {
      await user.update(SerializeFor.UPDATE_DB, conn);
      //Call access MS to update auth user
      await new Ams(context).updateAuthUser({
        user_uuid: context.user.user_uuid,
        wallet: body.wallet,
      });

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw err;
    }

    return user.serialize(SerializeFor.PROFILE);
  }
}
