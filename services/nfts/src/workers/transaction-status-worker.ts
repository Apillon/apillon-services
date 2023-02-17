import { AppEnvironment, Context, env } from '@apillon/lib';
import { Job, ServerlessWorker, WorkerDefinition } from '@apillon/workers-lib';
import { Transaction } from '../modules/transaction/models/transaction.model';

export class TransactionStatusWorker extends ServerlessWorker {
  private context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition);
    this.context = context;
  }

  public async before(data?: any): Promise<any> {
    // No used
  }
  public async execute(data?: any): Promise<any> {
    this.logFn(`TransactionStatusWorker - execute BEGIN: ${data}`);
    //Get all transaction, that were sent to blockchain
    const transactions: Transaction[] = await new Transaction(
      {},
      this.context,
    ).getTransactions(1);

    console.info(
      'Transactions that needs to be checked on blockchain: ',
      transactions,
    );
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`DeleteBucketDirectoryFileWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(`DeleteBucketDirectoryFileWorker - update definition: ${this.workerDefinition}`);
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    )
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    // this.logFn('DeleteBucketDirectoryFileWorker - update definition COMPLETE');
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
