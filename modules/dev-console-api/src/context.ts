import { Context, PopulateFrom, Ams } from 'at-lib';
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
    const tokenData = await new Ams().getAuthUser({ token: token });

    this.user = null;
    if (tokenData && tokenData.data.user_uuid) {
      const user = await new User({}, this).populateByUUID(
        this,
        tokenData.data.user_uuid,
      );

      if (user.exists()) {
        this.user = user;
      } else {
        // TODO: Trigger some exception to FR?
      }
    }
  }
}
