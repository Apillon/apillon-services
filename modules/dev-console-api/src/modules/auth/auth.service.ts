import { Injectable } from '@nestjs/common';
import { Ams } from 'at-lib';
import { LoginUserDto } from './dtos/login-user.dto';

@Injectable()
export class AuthService {
  async login(loginInfo: LoginUserDto): Promise<{ token: string }> {
    const res = await new Ams().login({
      email: loginInfo.email,
      password: loginInfo.password,
    });

    if (res.status) {
      return { token: res.data };
    } else {
      console.log('Invalid login information ...');
    }
  }
}
