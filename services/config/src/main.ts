import { ScsEventType } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';

import { QuotaService } from './modules/quota/quota.service';

export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [ScsEventType.GET_QUOTA]: QuotaService.getQuota,
  };

  return await processors[event.eventName](event, context);
}
