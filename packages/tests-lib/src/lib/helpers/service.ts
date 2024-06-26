import { v4 as uuidV4 } from 'uuid';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import { TestContext } from './context';

export async function createTestProjectService(
  consoleCtx: TestContext,
  project: Project,
  serviceType_id = 1,
): Promise<Service> {
  const service = new Service({}, consoleCtx).fake().populate({
    service_uuid: uuidV4(),
    project_id: project.id,
    serviceType_id: serviceType_id,
  });
  await service.insert();

  return service;
}
