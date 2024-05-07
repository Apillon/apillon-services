import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { DefaultUserRole, generateRandomCode } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { ProjectUser } from '@apillon/dev-console-api/src/modules/project/models/project-user.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { TestContext } from './context';
import { TestUser } from './user';
import * as bcrypt from 'bcryptjs';
import { Credit } from '@apillon/config/src/modules/credit/models/credit.model';
import { Subscription } from '@apillon/config/src/modules/subscription/models/subscription.model';

import { Stage } from '../interfaces/stage.interface';

export async function createTestProject(
  user: TestUser,
  stage: Stage,
  credit = 20000,
  subscriptionPackage_id?: number,
): Promise<Project> {
  const project = new Project({}, stage.context.devConsole)
    .fake()
    .populate({ project_uuid: uuidV4() });
  await project.insert();

  //add user to project and assign role
  const projectUser: ProjectUser = new ProjectUser(
    {},
    stage.context.devConsole,
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
    stage.context.config,
  ).insert();

  //If subscription package is specified, subscribe project to that subscription package
  if (subscriptionPackage_id) {
    await new Subscription(
      {
        package_id: subscriptionPackage_id,
        project_uuid: project.project_uuid,
        expiresOn: new Date(2050, 1, 1),
        subscriberEmail: 'subscriber@gmail.com',
        stripeId: 1,
      },
      stage.context.config,
    ).insert();
  }

  return project;
}

export async function createTestApiKey(
  amsContext: TestContext,
  project_uuid: string,
): Promise<ApiKey> {
  const apiKeySecret = generateRandomCode(12);

  const key: ApiKey = new ApiKey({}, amsContext).populate({
    apiKey: uuidV4(),
    apiKeySecret: bcrypt.hashSync(apiKeySecret),
    project_uuid,
  });

  await key.insert();

  key.apiKeySecret = apiKeySecret;

  return key;
}
