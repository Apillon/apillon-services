import { Injectable } from '@nestjs/common';
import { Ams, Lmas, LogType } from 'at-lib';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async callAuthService() {
    const resp = await new Ams().IsUserAuthenticated('492b6c65-343b-11ed-96a4-02420a000705', null, 'secToken');
    console.log(resp);
    return resp;
  }

  async testLogging(loopsize: number) {
    for (let i = 0; i < loopsize; i++) {
      await new Lmas().writeLog(
        {
          projectId: i.toString(),
          logType: LogType.MSG,
          message: `Test message ${i}`,
          location: 'dev-console-api/AppService/testLogging',
        },
        'sec-token',
      );
    }
  }
}
