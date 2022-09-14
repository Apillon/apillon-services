import { Lmas, LogType } from 'at-lib';

export class UserService {
  static async login(event, context) {
    return {
      id: 1,
      name: 'test',
    };
  }

  static async isAuthenticated(event, context) {
    // send log to monitoring service
    await new Lmas().writeLog(
      {
        logType: LogType.INFO,
        message: 'User auth has been called!',
        location: 'AMS/UserService/isAuthenticated',
      },
      'secToken1',
    );
    return true;
  }
}
