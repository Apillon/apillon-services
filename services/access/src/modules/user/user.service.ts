import { Lmas, LogType } from 'at-lib';
import { ServiceContext } from '../../context';

export class UserService {
  static async login(event, context: ServiceContext) {
    return {
      id: 1,
      name: 'test',
    };
  }

  static async isAuthenticated(event, context: ServiceContext) {
    // send log to monitoring service
    await new Lmas().writeLog(
      {
        logType: LogType.INFO,
        message: 'User auth has been called!',
        location: 'AMS/UserService/isAuthenticated',
      },
      'secToken1',
    );

    const res = await context.mysql.paramExecute(
      `
      SELECT * FROM authUser
      WHERE user_uuid = @uuid
    `,
      { uuid: event.user_uuid },
    );

    if (res.length) {
      return res[0];
    } else return false;
  }
}
