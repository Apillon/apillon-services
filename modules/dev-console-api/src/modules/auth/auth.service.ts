import { HttpStatus, Injectable } from '@nestjs/common';
import { Ams, CodeException } from 'at-lib';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { User } from '../user/models/user.model';
import { LoginUserDto } from './dtos/login-user.dto';

@Injectable()
export class AuthService {
  async login(
    loginInfo: LoginUserDto,
    context: DevConsoleApiContext,
  ): Promise<any> {
    try {
      const resp = await new Ams().login({
        email: loginInfo.email,
        password: loginInfo.password,
      });

      console.log('RESPONSE ', resp);
      console.log('USERRRR ', resp.user_uuid);

      const user = await new User({}, context).populateByUUID(
        context,
        resp.user_uuid,
      );

      if (!user.exists()) {
        // TODO: This is actually a critical error on AMS???
        throw new CodeException({
          code: ResourceNotFoundErrorCode.USER_DOES_NOT_EXISTS,
          status: HttpStatus.NOT_FOUND,
          errorCodes: ResourceNotFoundErrorCode,
        });
      }

      return {
        user: user,
        token: resp.token,
      };
    } catch (error) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ValidatorErrorCode.USER_INVALID_LOGIN,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
  }
}
