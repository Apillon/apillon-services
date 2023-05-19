import { AppEnvironment, Lmas, LogType, ServiceName, env } from '@apillon/lib';
import { CID } from 'ipfs-http-client';
import { FileStatus } from '../config/types';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { CrustService } from '../modules/crust/crust.service';
import { Directory } from '../modules/directory/models/directory.model';
import { File } from '../modules/storage/models/file.model';
import { PinToCrustRequest } from '../modules/crust/models/pin-to-crust-request.model';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { WorkerName } from '../workers/worker-executor';
import { PinToCrustWorker } from '../workers/pin-to-crust-worker';

/**
 * Function to create PinToCrustRequest
 * @param context
 * @param CID
 */
export async function pinFileToCRUST(
  context,
  bucket_uuid,
  CID: CID,
  size: number,
  isDirectory: boolean,
  refId: string,
  refTable: string,
) {
  console.info('Create PinToCrust request', {
    params: {
      bucket_uuid,
      CID,
      size,
      isDirectory,
      cidV0: CID.toV0().toString(),
    },
  });

  const pinToCrustRequest: PinToCrustRequest = new PinToCrustRequest(
    {},
    context,
  ).populate({
    bucket_uuid: bucket_uuid,
    cid: CID.toV0().toString(),
    size: size,
    isDirectory: isDirectory,
    refId: refId,
    refTable: refTable,
  });

  await pinToCrustRequest.insert();

  if (
    env.APP_ENV == AppEnvironment.LOCAL_DEV ||
    env.APP_ENV == AppEnvironment.TEST
  ) {
    //Directly calls worker for pinning
    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.LAMBDA,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };
    const wd = new WorkerDefinition(
      serviceDef,
      WorkerName.PIN_TO_CRUST_WORKER,
      {},
    );

    const worker = new PinToCrustWorker(wd, context);
    await worker.execute();

    return true;
  }
  return false;
}
