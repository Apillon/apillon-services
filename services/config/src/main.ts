import { ScsEventType } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';

import { QuotaService } from './modules/quota/quota.service';
import { OverrideService } from './modules/override/override.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [ScsEventType.GET_QUOTA]: QuotaService.getQuota,
    [ScsEventType.GET_ALL_QUOTAS]: QuotaService.getAllQuotas,
    [ScsEventType.CREATE_OVERRIDE]: OverrideService.createOverride,
    [ScsEventType.DELETE_OVERRIDE]: OverrideService.deleteOverride,
  };

  return await processors[event.eventName](event, context);
}
