import { ServerlessWorker } from './serverless-worker';
import { WorkerDefinition } from './worker-definition';
import { ServiceDefinition } from './interfaces';

export abstract class WorkerScheduler extends ServerlessWorker {
  public constructor(
    serviceDefinition: ServiceDefinition,
    workerName = 'scheduler',
  ) {
    super(new WorkerDefinition(serviceDefinition, workerName));
  }

  /**
   * should return definitions for workers to be started
   */
  public abstract getWorkerDefinitions(): Promise<Array<WorkerDefinition>>;

  public async execute() {
    const defs = await this.getWorkerDefinitions();
    await this.launchWorkers(defs);
  }
}
