import { ServerlessWorker, WorkerDefinition, Job } from '@apillon/workers-lib';
import { Context } from '@apillon/lib';
import { NotImplementedException } from '@nestjs/common';

export class TestWorker extends ServerlessWorker {
  private context: Context;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition);
    this.context = context;
  }

  public async before(data?: any): Promise<any> {
    this.logFn(`Test worker event - before: ${data}`);
  }
  public async execute(data?: any): Promise<any> {
    this.logFn(`Test worker event - execute BEGIN: ${data}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.logFn(`Test worker event - execute END: ${data}`);
  }
  public async onSuccess(data?: any, successData?: any): Promise<any> {
    this.logFn(`Test worker event - success: ${data} | ${successData} `);
  }
  public async onError(error: Error): Promise<any> {
    this.logFn(`Test worker event - error: ${error}`);
  }
  public async onUpdateWorkerDefinition(): Promise<void> {
    this.logFn(
      `Test worker event - update definition: ${this.workerDefinition}`,
    );
    // const job = await new Job({}, this.context).populateById(this.workerDefinition.id as number);
    // job.populate(this.workerDefinition, PopulateStrategy.WORKER);
    // await job.update();
    await new Job({}, this.context).updateWorkerDefinition(
      this.workerDefinition,
    );
    this.logFn('Test worker event - update definition COMPLETE');
  }
  public onAutoRemove(): Promise<void> {
    throw new NotImplementedException();
  }
}
