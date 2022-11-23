import { ConfigEventType } from '@apillon/lib';
import { ServiceContext } from './context';

import { QuotaService } from './modules/quota/quota.service';

export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [ConfigEventType.GET_QUOTA]: QuotaService.getQuota,
  };

  return await processors[event.eventName](event, context);
}
