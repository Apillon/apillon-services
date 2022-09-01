import { Injectable } from '@nestjs/common';
import { Ams, Lmas } from 'at-sdk';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async callAuthService() {
    const resp = await new Ams().IsUserAuthenticated(1, 2, 'test');
    console.log(resp);
    return resp;
  }

  async testLogging(loopsize: number) {
    for (let i = 0; i < loopsize; i++) {
      await new Lmas().writeLog(
        i,
        'TEST',
        `Test message ${i}`,
        'dev-console-api/AppService/testLogging',
        'secToken',
      );
    }
  }
}
