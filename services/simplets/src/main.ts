import {
  DeployMicroservice,
  Lmas,
  Mailing,
  SimpletsEventType,
  SimpletsMSEventType,
} from '@apillon/lib';
import { SimpletsController } from './modules/simplets/simplets.controller';
import { ServiceContext } from '@apillon/service-lib';
import { SimpletsService } from './modules/simplets/services/simplets.service';
import { SimpletsRepository } from './modules/simplets/repositores/simplets-repository';
import { SimpletsSpendService } from './modules/simplets/services/simplets-spend.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event: SimpletsMSEventType,
  context: ServiceContext,
): Promise<any> {
  const contractsService = new SimpletsService(
    context,
    new SimpletsRepository(context),
    new DeployMicroservice(context),
    new SimpletsSpendService(context),
    new Mailing(context),
    new Lmas(),
  );
  const controller = new SimpletsController(
    context,
    contractsService,
    new Lmas(),
  );

  switch (event.eventName) {
    case SimpletsEventType.SIMPLETS_LIST:
      return controller.listSimplets(event.body);
    case SimpletsEventType.SIMPLETS_DEPLOY:
      return controller.deploySimplet(event.body);
    case SimpletsEventType.GET_SIMPLET:
      return controller.getSimplet(event.body.uuid);
    //deployed
    case SimpletsEventType.LIST_DEPLOYED_SIMPLETS:
      return controller.listDeployedSimplets(event.body);
    case SimpletsEventType.GET_DEPLOYED_SIMPLET:
      return controller.getDeployedSimplet(event.body.uuid);
    default:
      throw new Error('Invalid Simplet Event Type');
  }
}
