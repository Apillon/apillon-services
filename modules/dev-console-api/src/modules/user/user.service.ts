import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Ams,
  CodeException,
  ErrorCode,
  generateJwtToken,
  JwtTokenType,
  LogType,
  Mailing,
  parseJwtToken,
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

    return user.serialize(SerializeFor.PROFILE);
  }

  async login(
    loginInfo: LoginUserDto,
    context: DevConsoleApiContext,
  ): Promise<any> {
    try {
      const resp = await new Ams().login({
        email: loginInfo.email,
        password: loginInfo.password,
      });

      const user = await new User({}, context).populateByUUID(
        context,
        resp.data.user_uuid,
      );

      if (!user.exists()) {
        throw new CodeException({
          status: HttpStatus.UNAUTHORIZED,
          code: ValidatorErrorCode.USER_INVALID_LOGIN,
          errorCodes: ValidatorErrorCode,
        });
      }

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

  async validateEmail(emailVal: ValidateEmailDto): Promise<any> {
    const email = emailVal.email;

    const res = await new Ams().emailExists(email);

    if (res.data.result === true) {
      throw new CodeException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ValidatorErrorCode.USER_EMAIL_ALREADY_TAKEN,
        errorCodes: ValidatorErrorCode,
      });
    }

    const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, {
      email,
    });

    await new Mailing().sendMail({
      emails: [email],
      subject: 'Welcome to Apillon!',
      template: 'welcome',
      data: { token },
    });

    return res;
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
      amsResponse = await new Ams().register({
        user_uuid: user.user_uuid,
        email,
        password,
      });
      await context.mysql.commit(conn);

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
    } catch (err) {
      // TODO: The context of this error is not correct. What happens if
      //       ams fails? FE will see it as a DB write error, which is incorrect.
      await context.mysql.rollback(conn);
      throw new CodeException({
        code: ErrorCode.ERROR_WRITING_TO_DATABASE,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCodes: ErrorCode,
      });
    }

    return {
      ...user.serialize(SerializeFor.PROFILE),
      token: amsResponse.data.token,
    };
  }

  async passwordResetRequest(body: ValidateEmailDto) {
    const res = await new Ams().emailExists(body.email);

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

    await new Mailing().sendMail({
      emails: [body.email],
      subject: 'Apillon password reset',
      template: 'resetPassword',
      data: { token },
    });

    return true;
  }

  async resetPassword(body: ResetPasswordDto) {
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

    await new Ams().resetPassword({
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
      await new Ams().updateAuthUser({
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
