import type { Context } from 'aws-lambda/handler';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    // [StorageEventType.REQUEST_S3_SIGNED_URL_FOR_UPLOAD]:
    //   StorageService.generateS3SignedUrlForUpload,
  };

  return await processors[event.eventName](event, context);
}
