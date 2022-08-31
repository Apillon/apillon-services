export class UserService {
  static async login(event, context) {
    return {
      id: 1,
      name: 'test',
    };
  }

  static async isAuthenticated(event, context) {
    return true;
  }
}
