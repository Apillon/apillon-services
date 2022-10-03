import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Ams,
  CodeException,
  ErrorCode,
  PopulateFrom,
  SerializeFor,
  ValidationException,
} from 'at-lib';
import { ValidatorErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { CreateUserDto } from './dtos/create-user.dto';
import { LoginUserDto } from '../auth/dtos/login-user.dto';
import { User } from './models/user.model';

@Injectable()
export class UserService {
  async createUser(
    body: CreateUserDto,
    context: DevConsoleApiContext,
  ): Promise<User> {
    const user: User = new User({}, context).populate(
      body,
      PopulateFrom.PROFILE,
    );

    try {
      await user.validate();
    } catch (err) {
      await user.handle(err);
      if (!user.isValid())
        throw new ValidationException(user, ValidatorErrorCode);
    }

    const conn = await context.mysql.start();
    try {
      await user.insert(SerializeFor.INSERT_DB, conn);
      await new Ams().register({
        user_uuid: user.user_uuid,
        email: body.email,
        password: body.password,
      });
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw new CodeException({
        code: ErrorCode.ERROR_WRITING_TO_DATABASE,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCodes: ErrorCode,
      });
    }

    return user;
  }

  async loginUser(body: LoginUserDto, context: DevConsoleApiContext) {
    let resp = null;
    resp = await new Ams().login({
      email: body.email,
      password: body.password,
    });

    console.log('RESPONSE ', resp);

    return resp;
  }
}
