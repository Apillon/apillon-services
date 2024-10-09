import {
  Context,
  PopulateFrom,
  Ams,
  runCachedFunction,
  CacheKeyPrefix,
  decodeJwtToken,
  generateCacheKey,
} from '@apillon/lib';
import { User } from './modules/user/models/user.model';

export class DevConsoleApiContext extends Context {
  token: string;
  /**
   * Strategy that should be used, to populate model.
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
    const { user_uuid } = decodeJwtToken(token);
    const user = await runCachedFunction(
      generateCacheKey({
        prefix: `${CacheKeyPrefix.AUTH_USER_DATA}:${user_uuid}`,
        path: '',
        user_uuid: token,
        query: {},
        params: {},
      }),
      async () => {
        const userData = await new Ams(this).getAuthUser({ token });

        if (userData?.data?.user_uuid) {
          const user = await new User({}, this).populateByUUID(
            userData.data.user_uuid,
          );

          if (user.exists()) {
            user.authUser = userData.data;
            user.setUserRolesAndPermissionsFromAmsResponse(userData);
            return user;
          }
        }
      },
    );
    this.user = new User(user);
  }
}
