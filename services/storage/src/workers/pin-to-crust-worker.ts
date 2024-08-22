import {
  AppEnvironment,
  Context,
  env,
  LogType,
  runWithWorkers,
  ServiceName,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  Job,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { CrustPinningStatus } from '../config/types';
import { CrustService } from '../modules/crust/crust.service';
import { PinToCrustRequest } from '../modules/crust/models/pin-to-crust-request.model';
import { Bucket } from '../modules/bucket/models/bucket.model';

export class PinToCrustWorker extends BaseSingleThreadWorker {
  protected context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(data?: any): Promise<any> {
    this.logFn(`PinToCrustWorker - execute BEGIN: ${data}`);

    //Get pending requests
    const pendingPinRequests: PinToCrustRequest[] = await new PinToCrustRequest(
      {},
      this.context,
    ).getPendingRequest();

    console.info(`Num of pendingPinRequests: ${pendingPinRequests.length}`);

    await runWithWorkers(
      pendingPinRequests,
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
        ? 1
        : 5,
      this.context,
      async (data) => {
        const pinToCrustRequest: PinToCrustRequest = new PinToCrustRequest(
          data,
          this.context,
        );

        const bucket: Bucket = await new Bucket(
          {},
          this.context,
        ).populateByUUID(pinToCrustRequest.bucket_uuid);

        try {
          await CrustService.placeStorageOrderToCRUST(
            {
              cid: pinToCrustRequest.cid,
              size: pinToCrustRequest.size,
              isDirectory: pinToCrustRequest.isDirectory,
              refTable: pinToCrustRequest.refTable,
              refId: pinToCrustRequest.refId,
              project_uuid: bucket.project_uuid,
            },
            this.context,
          );
          pinToCrustRequest.pinningStatus = CrustPinningStatus.SUCCESSFULL;
          pinToCrustRequest.message = '';
          pinToCrustRequest.numOfExecutions += 1;

          await pinToCrustRequest.update();

          await this.writeEventLog({
            logType: LogType.COST,
            project_uuid: bucket.project_uuid,
            message: 'Success placing storage order to CRUST',
            service: ServiceName.STORAGE,
            data: {
              pinToCrustRequest: pinToCrustRequest.serialize(),
            },
          });
        } catch (err) {
          try {
            pinToCrustRequest.pinningStatus = CrustPinningStatus.FAILED;
            pinToCrustRequest.message = err.message;
            pinToCrustRequest.numOfExecutions += 1;

            await pinToCrustRequest.update();
          } catch (err2) {
            console.error(err2);
          }

          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              project_uuid: bucket.project_uuid,
              message: 'Error at placing storage order to CRUST',
              service: ServiceName.STORAGE,
              data: {
                data: {
                  pinToCrustRequest: pinToCrustRequest.serialize(),
                },
                err,
              },
            },
            LogOutput.SYS_ERROR,
          );
        }
      },
    );

    console.info(
      'Pinning completed. Checking for pins, that should be renewed',
    );

    //Get pin to crust request, that need to be renewed.
    //Update those request and they should be pinned in next worker iteration
    await new PinToCrustRequest({}, this.context).renewOldRequests();

    return true;
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`PinToCrustWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(`DeleteBucketDirectoryFileWorker - update definition: ${this.workerDefinition}`);
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    }
    // this.logFn('DeleteBucketDirectoryFileWorker - update definition COMPLETE');
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
