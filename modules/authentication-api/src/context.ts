import { Context } from '@apillon/lib';
import { TestContext } from '../test/helpers/context';

export class AuthenticationApiContext extends Context {
  requestChallenge: any;
  verifierDidUri: any;
}

export class AuthenticationApiContextTest {
  requestChallenge: any;
  verifierDidUri: any;
  mysql: any;
  user: any;
  requestId: any;
  apiKey: any;
  isAuthenticated: any;
  setMySql: any;
  hasRole: any;
  hasRoleOnProject: any;
  hasApiKeyRoleForServiceType: any;
}
applyMixins(AuthenticationApiContextTest, [
  AuthenticationApiContext,
  TestContext,
]);

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== 'constructor') {
        derivedCtor.prototype[name] = baseCtor.prototype[name];
      }
    });
  });
}
