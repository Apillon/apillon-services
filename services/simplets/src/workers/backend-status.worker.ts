import {
  Context,
  env,
  Lmas,
  LogType,
  ResourceDeployWebhookDataDto,
  runWithWorkers,
  ServiceName,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { SimpletsRepository } from '../modules/simplets/repositores/simplets-repository';
import { SimpletsCodeException } from '../lib/exceptions';

export class BackendStatusWorker extends BaseQueueWorker {
  private simpletRepository: SimpletsRepository;

  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
    simpletRepository: SimpletsRepository,
    logger: Lmas,
  ) {
    super(
      workerDefinition,
      context,
      type,
      env.SIMPLETS_AWS_WORKER_SQS_URL,
      logger,
    );
    this.simpletRepository = simpletRepository;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: {
    data: ResourceDeployWebhookDataDto[];
  }): Promise<any> {
    // console.info('RUN EXECUTOR (ResourceStatusWorker). data: ', input);
    await runWithWorkers(
      input.data,
      50,
      this.context,
      async (res: ResourceDeployWebhookDataDto, ctx) => {
        console.info('processing webhook transaction: ', res);
        //const isBackendDeploy = res.referenceTable === DbTables.BACKEND;
        const backend_uuid = res.referenceId;
        try {
          const simpletDeploy =
            await this.simpletRepository.getSimpletDeployByBackend(
              backend_uuid,
            );
          simpletDeploy.backendStatus = res.resourceStatus;
          await simpletDeploy.update();
        } catch (e) {
          if (e instanceof SimpletsCodeException && e.status === 404) {
            await this.writeEventLog({
              logType: LogType.ERROR,
              message: `Backend with uuid ${backend_uuid} not found.`,
              service: ServiceName.SIMPLETS,
              data: {
                backend_uuid,
              },
            });
            return;
          }
          await this.writeEventLog({
            logType: LogType.ERROR,
            message: `An error occurred while processing backend with uuid ${backend_uuid}.`,
            service: ServiceName.SIMPLETS,
            data: {
              backend_uuid,
              error: e.message,
              stack: e.stack,
            },
          });
          return;
        }
      },
    );
  }
}
