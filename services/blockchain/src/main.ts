import { ServiceContext } from './context';

export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {};

  return await processors[event.eventName](event, context);
}
