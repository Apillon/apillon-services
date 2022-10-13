import { Injectable } from '@nestjs/common';
import { Ams, Lmas, LogType } from 'at-lib';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async callAuthService() {
    const resp = await new Ams().getAuthUser({
      token: 'Tralala',
    });
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
