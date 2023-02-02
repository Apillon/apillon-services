import { Context, PopulateFrom, Ams } from '@apillon/lib';
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
    this.user = null;
    if (!token) {
      return;
    }

    const userData = await new Ams(this).getAuthUser({ token: token });

    if (userData && userData.data.user_uuid) {
      const user = await new User({}, this).populateByUUID(
        userData.data.user_uuid,
      );

      if (user.exists()) {
        user.authUser = userData.data;
        user.userRoles =
          user.authUser?.authUserRoles
            ?.filter((x) => !x.project_uuid)
            ?.map((x) => x.role_id) || [];
        this.user = user;
      }
    }
  }
}
