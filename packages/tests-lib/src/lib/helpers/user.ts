import { AuthUser } from '@apillon/access/src/modules/auth-user/auth-user.model';
import { TestContext } from './context';
import { DefaultUserRole, SqlModelStatus } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { User } from '@apillon/dev-console-api/src/modules/user/models/user.model';
import { ProjectUser } from '@apillon/dev-console-api/src/modules/project/models/project-user.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';

export interface TestUser {
  user: User;
  authUser: AuthUser;
  token: string;
  password: string;
}

export async function createTestUser(
  consoleCtx: TestContext,
  amsCtx: TestContext,
  roleId = DefaultUserRole.USER,
  status = SqlModelStatus.ACTIVE,
  project_uuid = '',
): Promise<TestUser> {
  const user = new User({}, consoleCtx).fake();
  user.user_uuid = uuidV4();
  user.status = status;
  await user.insert();

  const password = 'randomPassword231321';
  const authUser = new AuthUser({}, amsCtx).fake();
  authUser.user_uuid = user.user_uuid;
  authUser.email = user.email;
  authUser.setPassword(password);
  await authUser.insert();
  await authUser.setDefaultRole(null);
  if (roleId) {
    if (project_uuid) {
      const project: Project = await new Project({}, consoleCtx).populateByUUID(
        project_uuid,
      );

      const projectUser: ProjectUser = new ProjectUser({}, consoleCtx).populate(
        {
          project_id: project.id,
          user_id: user.id,
          pendingInvitation: false,
          role_id: roleId,
        },
      );
      await projectUser.insert();
    }
    if (!authUser.authUserRoles.find((u) => u.role_id === roleId)) {
      await authUser.assignRole(project_uuid, roleId);
    }
  }

  await authUser.loginUser();

  return {
    user,
    authUser,
    token: authUser.token,
    password,
  };
}
