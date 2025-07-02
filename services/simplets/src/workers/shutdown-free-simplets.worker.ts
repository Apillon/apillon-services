import {
  Ams,
  Context,
  DeployMicroservice,
  EmailDataDto,
  EmailTemplate,
  GenericDeployRequestDto,
  Mailing,
  Scs,
} from '@apillon/lib';
import { BaseSingleThreadWorker, WorkerDefinition } from '@apillon/workers-lib';
import { SimpletsRepository } from '../modules/simplets/repositores/simplets-repository';
import { SimpletDeploy } from '../modules/simplets/models/simpletDeploy.model';

export class ShutdownFreeSimpletsWorker extends BaseSingleThreadWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    private readonly simpletsRepository: SimpletsRepository,
    private readonly deployMS: DeployMicroservice,
    private readonly configMS: Scs,
    private readonly mailingMS: Mailing,
    private readonly accessMS: Ams,
  ) {
    super(workerDefinition, context);
    this.logPrefix = '[ShutdownFreeSimpletsWorker]';
  }

  async runExecutor(_data: void): Promise<void> {
    this.logFn('ShutdownFreeSimpletsWorker - execute BEGIN');

    // TODO: to optimize we should only retrieve simplet and project uuids else
    //  after some time we could get too many simplets returned
    const deployedSimplets =
      await this.simpletsRepository.getActiveDeployedSimpletsLongerThanDays(3);
    if (!deployedSimplets.length) {
      this.logFn('No deployed simplets found running for more than 3 days');
      return;
    }

    const projectsToCheck = Array.from(
      new Set<string>(deployedSimplets.map((simplet) => simplet.project_uuid)),
    );
    this.logFn(
      `Found ${deployedSimplets.length} active deployed simplets running for ${projectsToCheck.length} projects for more than 3 days`,
    );
    const projectSimpletMap = new Map<string, SimpletDeploy[]>();
    deployedSimplets.forEach((simplet) => {
      if (!projectSimpletMap.has(simplet.project_uuid)) {
        projectSimpletMap.set(simplet.project_uuid, []);
      }
      projectSimpletMap.get(simplet.project_uuid).push(simplet);
    });
    await Promise.all(
      projectsToCheck.map(async (projectUuid) => {
        if (await this.configMS.projectHasPaidSubscription(projectUuid)) {
          this.logFn(
            `Skipping project ${projectUuid} with paid subscription package.`,
          );
          return;
        }

        const simpletDeploys = projectSimpletMap.get(projectUuid);
        this.logFn(
          `Shutting down ${simpletDeploys.length} simplets for project ${projectUuid}`,
        );

        await Promise.all(
          simpletDeploys.map((simpletDeploy) =>
            this.disableSimplet(simpletDeploy),
          ),
        );
      }),
    );
  }

  async disableSimplet(simpletDeploy: SimpletDeploy) {
    try {
      await this.deployMS.shutdownInstance(
        new GenericDeployRequestDto({}, this.context).populate({
          deploy_uuid: simpletDeploy.backend_uuid,
        }),
      );
      simpletDeploy.trialExpired = true;
      await simpletDeploy.update();
      const projectOwner = (
        await this.accessMS.getProjectOwner(simpletDeploy.project_uuid)
      ).data;

      if (projectOwner?.email) {
        await this.mailingMS.sendMail(
          new EmailDataDto({}, this.context).populate({
            mailAddresses: [projectOwner.email],
            templateName: EmailTemplate.BACKEND_SHUTDOWN,
          }),
        );
      }
      this.logFn(
        `Simplet with uuid ${simpletDeploy.simpletDeploy_uuid} for project ${simpletDeploy.project_uuid} successfully shut down.`,
      );
    } catch (e: unknown) {
      this.logFn(
        `Error shutting down simplet ${simpletDeploy.simpletDeploy_uuid} for project ${simpletDeploy.project_uuid}: ${e instanceof Error ? e.message : e.toString()}`,
      );
    }
  }
}
