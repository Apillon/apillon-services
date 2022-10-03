import { Injectable } from '@nestjs/common';
import { Ams } from 'at-lib';
import { LoginUserDto } from './dtos/login-user.dto';

@Injectable()
export class AuthService {
  async login(loginInfo: LoginUserDto): Promise<{ token: string }> {
    const resp = await new Ams().login({
      email: loginInfo.email,
      password: loginInfo.password,
    });

    console.log('RESPONSE ', resp);

    if (resp.status) {
      return { token: resp.data };
    } else {
      console.log('Invalid login information ...');
    }
  }
}
