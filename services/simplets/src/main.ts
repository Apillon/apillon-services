import {
  ModelValidationException,
  SimpletDeployDto,
  SimpletRedeployDto,
  SimpletsEventType,
  SimpletsMSEventType,
  ValidatorErrorCode,
} from '@apillon/lib';
import { SimpletsController } from './modules/simplets/simplets.controller';
import { ServiceContext } from '@apillon/service-lib';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @param controller
 * @returns service response
 */
export async function processEvent(
  event: SimpletsMSEventType,
  context: ServiceContext,
  controller: SimpletsController,
): Promise<any> {
  switch (event.eventName) {
    case SimpletsEventType.SIMPLETS_LIST:
      return controller.listSimplets(event.body);
    case SimpletsEventType.SIMPLETS_DEPLOY:
      return controller.deploySimplet(
        await new SimpletDeployDto({}, context)
          .populate(event.body)
          .validateOrThrow(ModelValidationException, ValidatorErrorCode),
      );
    case SimpletsEventType.SIMPLETS_REDEPLOY:
      return controller.redeploySimplet(
        await new SimpletRedeployDto({}, context)
          .populate(event.body)
          .validateOrThrow(ModelValidationException, ValidatorErrorCode),
      );
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
