import {
  Context,
  DeployMicroservice,
  DeploySecretDto,
  EncryptionService,
  env,
  Lmas,
  LogType,
  overrideEnvironmentVariables,
  RedeployInstanceDto,
  ResourceDeployWebhookDataDto,
  ResourceStatus,
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
import { ResourceType } from '../modules/simplets/types';

export class FrontendStatusWorker extends BaseQueueWorker {
  private simpletRepository: SimpletsRepository;
  private encryptionService: EncryptionService;
  private deployService: DeployMicroservice;

  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
    simpletRepository: SimpletsRepository,
    deployService: DeployMicroservice,
    encryptionService: EncryptionService,
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
    this.deployService = deployService;
    this.encryptionService = encryptionService;
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
      async (res: ResourceDeployWebhookDataDto, _ctx) => {
        console.info('processing webhook transaction: ', res);
        if (res.referenceTable !== ResourceType.FRONTEND) {
          return;
        }
        const { referenceId: frontend_uuid, data: frontendUrl } = res;

        try {
          const simpletDeploy =
            await this.simpletRepository.getSimpletDeployByFrontend(
              frontend_uuid,
            );
          simpletDeploy.frontendStatus = res.resourceStatus;

          // push frontend URL to backend
          if (res.resourceStatus === ResourceStatus.ONLINE) {
            const secrets = await this.encryptionService.decryptJson<
              DeploySecretDto[]
            >(simpletDeploy.backendVariables);
            const response = await this.deployService.redeployDockerCompose(
              new RedeployInstanceDto({}, this.context).populate({
                backend_uuid: simpletDeploy.backend_uuid,
                dockerCompose: simpletDeploy.backendDockerCompose,
                virtualMachine: simpletDeploy.backendVirtualMachine,
                secrets: overrideEnvironmentVariables(secrets, [
                  { key: 'APP_URL', value: frontendUrl },
                ]),
              }),
            );
            if (!response || !response.success) {
              await this.writeEventLog({
                logType: LogType.ERROR,
                message: `Failed to redeploy Docker compose for backend ${simpletDeploy.backend_uuid}`,
                service: ServiceName.SIMPLETS,
                data: {
                  backend_uuid: simpletDeploy.backend_uuid,
                  response,
                },
              });
              throw new Error(
                `Failed to redeploy Docker compose for backend ${simpletDeploy.backend_uuid}`,
              );
            }
          }
          await simpletDeploy.update();
        } catch (e) {
          if (e instanceof SimpletsCodeException && e.status === 404) {
            await this.writeEventLog({
              logType: LogType.ERROR,
              message: `Frontend with uuid ${frontend_uuid} not found.`,
              service: ServiceName.SIMPLETS,
              data: {
                frontend_uuid,
              },
            });
            return;
          }
          await this.writeEventLog({
            logType: LogType.ERROR,
            message: `An error occurred while processing frontend with uuid ${frontend_uuid}.`,
            service: ServiceName.SIMPLETS,
            data: {
              frontend_uuid,
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
