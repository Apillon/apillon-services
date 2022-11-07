import { Context } from '@apillon/lib';

export class ApillonApiContext extends Context {
  /**
   * Authenticates user based on received authentication token. Call AMS service
   * @param token Authentication token.
   */
  async authenticate(token: string) {
    //TODO
  }
}
