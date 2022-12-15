import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { DefaultUserRole, generatePassword } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { ProjectUser } from '../../src/modules/project/models/project-user.model';
import { Project } from '../../src/modules/project/models/project.model';
import { TestContext } from './context';
import { TestUser } from './user';

export async function createTestProject(
  user: TestUser,
  consoleCtx: TestContext,
): Promise<Project> {
  const project = new Project({}, consoleCtx)
    .fake()
    .populate({ project_uuid: uuidV4() });
  await project.insert();

  //add user to project and assign role
  const projectUser: ProjectUser = new ProjectUser({}, consoleCtx).populate({
    project_id: project.id,
    user_id: user.user.id,
    pendingInvitation: false,
    role_id: DefaultUserRole.PROJECT_OWNER,
  });
  await projectUser.insert();

  //assign user role on project
  await user.authUser.assignRole(
    project.project_uuid,
    DefaultUserRole.PROJECT_OWNER,
  );

  return project;
}

export async function createTestApiKey(
  amsContext: TestContext,
  project_uuid: string,
) {
  const apiKeySecret = generatePassword(12);
  const key: ApiKey = new ApiKey({}, amsContext).populate({
    apiKey: uuidV4(),
    apiKeySecret: apiKeySecret,
    project_uuid: project_uuid,
  });

  await key.insert();

  return key;
}
