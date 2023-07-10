import { AppEnvironment, env } from '@apillon/lib';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { CID } from 'ipfs-http-client';
import { PinToCrustRequest } from '../modules/crust/models/pin-to-crust-request.model';
import { File } from '../modules/storage/models/file.model';
import { PinToCrustWorker } from '../workers/pin-to-crust-worker';
import { WorkerName } from '../workers/worker-executor';
import { CrustPinningStatus, DbTables, FileStatus } from '../config/types';
import { Directory } from '../modules/directory/models/directory.model';

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

  //Check if PinToCrustRequest with same CID already exists
  let pinToCrustRequest: PinToCrustRequest = await new PinToCrustRequest(
    {},
    context,
  ).populateByCid(CID.toV0().toString());

  if (pinToCrustRequest.exists()) {
    //Request for pin already exists
    if (refTable == DbTables.FILE) {
      const file: File = await new File({}, context).populateByUUID(refId);
      if (file.exists()) {
        file.fileStatus = FileStatus.PINNED_TO_CRUST;
        await file.update();
      }
    }
    //If pinToCrustRequest was not successfully submitted to CRUST, reset status and number of executions. (PinToCrust worker will fetch this request and trigger pin to CRUST)
    if (
      pinToCrustRequest.pinningStatus == CrustPinningStatus.FAILED &&
      pinToCrustRequest.numOfExecutions >= 5
    ) {
      pinToCrustRequest.pinningStatus = CrustPinningStatus.PENDING;
      pinToCrustRequest.numOfExecutions = 0;
      await pinToCrustRequest.update();
    }
  } else {
    pinToCrustRequest = new PinToCrustRequest({}, context).populate({
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
    }
  }
}
