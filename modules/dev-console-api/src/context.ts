import { Ams, Context, PopulateFrom } from 'at-lib';
import { User } from './modules/user/models/user.model';

export class DevConsoleApiContext extends Context {
  /**
   * Strategy that should be used, to populate model. TODO: In authenticate, fill this!!!!
   * @returns
   */
  populationStrategy: PopulateFrom = PopulateFrom.PROFILE;

  /**
   * Authenticates user based on received authentication token. Call AMS service
   * @param token Authentication token.
   */
  async authenticate(token: string) {
    const tokenData = await new Ams().parseTokenData(token);

    this.user = null;

    if (tokenData && tokenData.userId && !isNaN(Number(tokenData.userId))) {
      const user = await new User({}, this).populateById(
        Number(tokenData.userId),
      );

      if (user.exists()) {
        this.user = user;
      }
    }
  }
}
