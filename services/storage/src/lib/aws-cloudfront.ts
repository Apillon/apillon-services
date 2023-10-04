import {
  Context,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  env,
} from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';

import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront'; // ES Modules import
import { Website } from '../modules/hosting/models/website.model';

/**
 * AWS Cloudfront invalidation command
 * @param context serviceContext
 * @param website website with cdnId(CDN distribution) property, for which invalidation will be created
 * @returns
 */
export async function createCloudfrontInvalidationCommand(
  context: Context,
  website: Website,
) {
  if (!website.cdnId) {
    return false;
  }

  try {
    const client = new CloudFrontClient({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_KEY,
        secretAccessKey: env.AWS_SECRET,
      },
    });
    const input = {
      // CreateInvalidationRequest
      DistributionId: website.cdnId,
      InvalidationBatch: {
        // InvalidationBatch
        Paths: {
          // Paths
          Quantity: 1, // required
          Items: [
            // PathList
            '/*',
          ],
        },
        CallerReference: uuidV4(), // required
      },
    };
    const command = new CreateInvalidationCommand(input);
    await client.send(command);

    await new Lmas().writeLog({
      context: context,
      project_uuid: website.project_uuid,
      logType: LogType.INFO,
      message: 'Cloudfront invalidation command created',
      location: `createCloudfrontInvalidationCommand`,
      service: ServiceName.STORAGE,
      data: {
        website: website.serialize(SerializeFor.PROFILE),
      },
    });

    return true;
  } catch (err) {
    await new Lmas().writeLog({
      context: context,
      project_uuid: website.project_uuid,
      logType: LogType.ERROR,
      message: 'Cloudfront invalidation command failed',
      location: `createCloudfrontInvalidationCommand`,
      service: ServiceName.STORAGE,
      data: {
        website: website.serialize(SerializeFor.PROFILE),
        error: err,
      },
    });
  }
  return false;
}
