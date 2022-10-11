import { User } from 'dev-console-api/src/modules/user/models/user.model';
import { AuthUser } from 'at-ams/src/modules/auth-user/auth-user.model';
import { TestContext } from './context';
import { DefaultUserRole, SqlModelStatus } from 'at-lib';

export interface TestUser {
  user: User;
  authUser: AuthUser;
  token: string;
  password: string;
}

export async function createTestUser(
  consoleCtx: TestContext,
  amsCtx: TestContext,
  role = DefaultUserRole.USER,
  status = SqlModelStatus.ACTIVE,
  project_uuid = '',
): Promise<TestUser> {
  const user = new User({}, consoleCtx).fake();
  user.status = status;
  await user.insert();

  const password = 'randomPassword231321';
  const authUser = new AuthUser({}, amsCtx).fake();
  authUser.user_uuid = user.user_uuid;
  authUser.setPassword(password);
  await authUser.insert();
  await authUser.setDefaultRole(null);
  if (project_uuid && role) {
    await authUser.assignRole(project_uuid, role);
  }

  // todo
  const token = 'todo!';

  return {
    user,
    authUser,
    token,
    password,
  };
}
