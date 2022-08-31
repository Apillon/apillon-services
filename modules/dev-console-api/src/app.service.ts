import { Injectable } from '@nestjs/common';
import * as AT from 'at-sdk';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async callAuthService() {
    const resp = await AT.IsUserAuthenticated(1, 2, 'test');
    console.log(resp);
    return resp;
  }
}
