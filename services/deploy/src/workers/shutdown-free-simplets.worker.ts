import {
  Ams,
  Context,
  EmailDataDto,
  EmailTemplate,
  Mailing,
  Scs,
  SubscriptionPackageId,
} from '@apillon/lib';
import { BaseSingleThreadWorker, WorkerDefinition } from '@apillon/workers-lib';
import { DeployRepository } from '../modules/deploy/repositores/deploy-repository';
import { BackendStrategyHandler } from '../modules/deploy/backendStrategy.handler';

export class ShutdownFreeSimpletsWorker extends BaseSingleThreadWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    private readonly deployRepository: DeployRepository,
    private readonly backendStarategyHandler: BackendStrategyHandler,
    private readonly configMS: Scs,
    private readonly mailingMS: Mailing,
    private readonly accessMS: Ams,
  ) {
    super(workerDefinition, context);
    this.logPrefix = '[ShutdownFreeSimpletsWorker]';
  }

  async runExecutor(_data: void): Promise<void> {
    this.logFn('ShutdownFreeSimpletsWorker - execute BEGIN');

    // Get all active deployed simplets that are running for more than 3 days
    const deployedBE =
      await this.deployRepository.getActiveDeployedBackendsLongerThanDays(3);

    const projectsToCheck = Array.from(
      new Set<string>(deployedBE.map((simplet) => simplet.project_uuid)),
    );

    this.logFn(
      `Found ${deployedBE.length} active deployed backends running for more than 3 days`,
    );

    await Promise.all(
      projectsToCheck.map(async (projectUuid) => {
        const subscription = (
          await this.configMS.getProjectActiveSubscription(projectUuid)
        ).data;

        if (
          subscription &&
          subscription.package_id !== SubscriptionPackageId.FREEMIUM
        ) {
          return;
        }

        const backends = deployedBE.filter(
          (simplets) => simplets.project_uuid === projectUuid,
        );

        this.logFn(
          `Shutting down ${backends.length} simplets for project ${projectUuid}`,
        );

        await Promise.all(
          backends.map(async (backend) => {
            await this.backendStarategyHandler.shutdownInstance(backend);

            this.logFn(
              `Simplet with uuid ${backend.backend_uuid} for project ${projectUuid} successfully shut down`,
            );
          }),
        );

        if (backends.length) {
          const projectOwner = (
            await this.accessMS.getProjectOwner(projectUuid)
          ).data;

          if (projectOwner?.email) {
            await this.mailingMS.sendMail(
              new EmailDataDto({}, this.context).populate({
                mailAddresses: [projectOwner.email],
                templateName: EmailTemplate.BACKEND_SHUTDOWN,
              }),
            );
          }
        }
      }),
    );
  }
}
