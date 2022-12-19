import { ServiceContext } from '../context';
import { BucketWebhook } from '../modules/bucket/models/bucket-webhook.model';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';
import { File } from '../modules/storage/models/file.model';
import axios from 'axios';
import { BucketWebhookAuthMethod } from '../config/types';
import { Lmas, LogType, ServiceName } from '@apillon/lib';

export async function sendTransferredFilesToBucketWebhook(
  context: ServiceContext,
  bucket: Bucket,
  files: File[],
) {
  //Check if webhook is set in this bucket
  const bucketWebhook: BucketWebhook = await new BucketWebhook(
    {},
    context,
  ).populateByBucketId(bucket.id);

  if (bucketWebhook.exists() && files.length > 0) {
    let config = {};
    let body = {};
    try {
      //assemble body and send request to url
      body = {
        files: files.map((x) => {
          return {
            file_uuid: x.file_uuid,
            CID: x.CID,
          };
        }),
      };

      if (bucketWebhook.authMethod == BucketWebhookAuthMethod.BASIC) {
        config = {
          auth: {
            username: bucketWebhook.param1,
            password: bucketWebhook.param2,
          },
        };
      } else if (bucketWebhook.authMethod == BucketWebhookAuthMethod.TOKEN) {
        config = {
          headers: { Authorization: 'Bearer ' + bucketWebhook.param1 },
        };
      }

      await axios.post(bucketWebhook.url, body, config);
      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.INFO,
        message: 'Sending trasferred files to bucket webhook - success',
        location: `Storage/sendTransferredFilesToBucketWebhook`,
        service: ServiceName.STORAGE,
        data: {
          config: config,
          body: body,
        },
      });
    } catch (err) {
      await new Lmas().writeLog({
        context: context,
        project_uuid: bucket.project_uuid,
        logType: LogType.ERROR,
        message: `Sending trasferred files to bucket webhook - error`,
        location: `Storage/sendTransferredFilesToBucketWebhook`,
        service: ServiceName.STORAGE,
        data: {
          error: err,
          config: config,
          body: body,
        },
      });
    }
  }
}
