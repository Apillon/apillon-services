import {
  AppEnvironment,
  Context,
  env,
  Lmas,
  LogType,
  runWithWorkers,
  ServiceName,
} from '@apillon/lib';
import { Job, ServerlessWorker, WorkerDefinition } from '@apillon/workers-lib';
import { CID } from 'ipfs-http-client';
import { CrustPinningStatus } from '../config/types';
import { CrustService } from '../modules/crust/crust.service';
import { PinToCrustRequest } from '../modules/crust/models/pin-to-crust-request.model';

export class PinToCrustWorker extends ServerlessWorker {
  private context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition);
    this.context = context;
  }

  public async before(_data?: any): Promise<any> {
    // No used
  }
  public async execute(data?: any): Promise<any> {
    this.logFn(`PinToCrustWorker - execute BEGIN: ${data}`);

    //Get pending requests
    const pendingPinRequests: PinToCrustRequest[] = await new PinToCrustRequest(
      {},
      this.context,
    ).getPendingRequest();

    await runWithWorkers(
      pendingPinRequests,
      20,
      this.context,
      async (data, ctx) => {
        const pinToCrustRequest: PinToCrustRequest = new PinToCrustRequest(
          data,
          ctx,
        );
        try {
          await CrustService.placeStorageOrderToCRUST(
            {
              cid: CID.parse(pinToCrustRequest.cid),
              size: pinToCrustRequest.size,
              isDirectory: pinToCrustRequest.isDirectory,
              refTable: pinToCrustRequest.refTable,
              refId: pinToCrustRequest.refId,
            },
            ctx,
          );
          pinToCrustRequest.pinningStatus = CrustPinningStatus.SUCCESSFULL;
          pinToCrustRequest.message = '';
          pinToCrustRequest.numOfExecutions += 1;

          await pinToCrustRequest.update();

          await new Lmas().writeLog({
            context: ctx,
            logType: LogType.COST,
            message: 'Success placing storage order to CRUST',
            location: `PinToCrustWorker`,
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

          await new Lmas().writeLog({
            context: ctx,
            logType: LogType.ERROR,
            message: 'Error at placing storage order to CRUST',
            location: `PinToCrustWorker`,
            service: ServiceName.STORAGE,
            data: {
              data: {
                pinToCrustRequest: pinToCrustRequest.serialize(),
              },
              err,
            },
          });
        }
      },
    );
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
