import { Ams, Context, PopulateFrom } from 'at-lib';
import { User } from './modules/user/models/user.model';

export class DevConsoleApiContext extends Context {
  /**
   * Strategies that should be used, to populate model. TODO: In authenticate, fill this!!!!
   * @returns
   */
  modelPopulationStrategies: string[] = [PopulateFrom.PROFILE];

  /**
   * Authenticates user based on received authentication token. Call AMS service
   * @param token Authentication token.
   */
  async authenticate(token: string) {
    //const tokenData = parseToken(JwtTokenType.USER_AUTHENTICATION, token, this) as AuthenticationTokenData;
    const tokenData = {
      userId: 1,
    };
    this.user = null;

    if (tokenData && tokenData.userId && !isNaN(Number(tokenData.userId))) {
      const user = await new User({}, this).populateById(
        Number(tokenData.userId),
      );

      if (user.exists()) {
        this.user = user;
        //TODO - Call AMS service with user uuid
        // const resp = await new Ams().IsUserAuthenticated('492b6c65-343b-11ed-96a4-02420a000705', null, 'secToken');
        // if (resp) {
        //   //success
        //   this.user = user;
        // } else {
        //   //TODO handle ERROR
        // }
      }
    }
  }
}
