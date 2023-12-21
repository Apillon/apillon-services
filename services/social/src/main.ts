import type { Context } from 'aws-lambda/handler';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    //[SocialEventType.CREATE_SPACE]: NftsService.createCollection,
  };

  return await processors[event.eventName](event, context);
}
