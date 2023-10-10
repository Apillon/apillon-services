import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { DefaultUserRole, generatePassword } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { ProjectUser } from '@apillon/dev-console-api/src/modules/project/models/project-user.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { TestContext } from './context';
import { TestUser } from './user';
import * as bcrypt from 'bcryptjs';
import { Credit } from '@apillon/config/src/modules/credit/models/credit.model';
import { Stage } from '../interfaces/stage.interface';

export async function createTestProject(
  user: TestUser,
  stage: Stage,
  credit = 20000,
): Promise<Project> {
  const project = new Project({}, stage.devConsoleContext)
    .fake()
    .populate({ project_uuid: uuidV4() });
  await project.insert();

  //add user to project and assign role
  const projectUser: ProjectUser = new ProjectUser(
    {},
    stage.devConsoleContext,
  ).populate({
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

  //add credit to project
  await new Credit(
    {
      project_uuid: project.project_uuid,
      balance: credit,
    },
    stage.configContext,
  ).insert();

  return project;
}

export async function createTestApiKey(
  amsContext: TestContext,
  project_uuid: string,
): Promise<ApiKey> {
  const apiKeySecret = generatePassword(12);

  const key: ApiKey = new ApiKey({}, amsContext).populate({
    apiKey: uuidV4(),
    apiKeySecret: bcrypt.hashSync(apiKeySecret),
    project_uuid: project_uuid,
  });

  await key.insert();

  key.apiKeySecret = apiKeySecret;

  return key;
}
