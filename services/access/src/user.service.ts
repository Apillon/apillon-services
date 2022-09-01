import { writeLog } from 'at-sdk';

export class UserService {
  static async login(event, context) {
    return {
      id: 1,
      name: 'test',
    };
  }

  static async isAuthenticated(event, context) {
    // send log to monitoring service
    writeLog(
      null,
      'User Auth',
      'User auth has been called!',
      'AMS/UserService/isAuthenticated',
      'secToken',
    );
    return true;
  }
}
