import { Injectable } from '@nestjs/common';
import { ValidationException } from 'at-lib';
import { ValidatorErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './models/user.model';

@Injectable()
export class UserService {
  async createUser(
    body: CreateUserDto,
    context: DevConsoleApiContext,
  ): Promise<User> {
    const user: User = new User({}, context).populate(body);

    try {
      await user.validate();
    } catch (err) {
      await user.handle(err);
      if (!user.isValid())
        throw new ValidationException(user, ValidatorErrorCode);
    }

    await user.insert();

    return user;
  }
}
