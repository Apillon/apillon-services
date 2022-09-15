import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CodeException, ValidationException } from 'at-lib';
import { Context } from '../../context';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './models/user.model';

@Injectable()
export class UserService {
  async createUser(body: CreateUserDto, context: Context): Promise<User> {
    let user: User = new User({}, context).populate({ body });

    try {
      await user.validate();
    } catch (err) {
      await user.handle(err);
      if (!user.isValid()) throw new ValidationException(user);
    }

    try {
      await user.insert();
    } catch (err) {
      throw new CodeException({
        code: 100,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errorMessage: err.message,
      });
    }

    return user;
  }
}
