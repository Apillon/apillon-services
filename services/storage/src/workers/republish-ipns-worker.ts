import { Context, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import axios from 'axios';

export class RepublishIpnsWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.STORAGE_AWS_WORKER_SQS_URL);
  }
  async runPlanner(data?: any): Promise<any[]> {
    const ipnsRes = await this.context.mysql.paramExecute(`
      SELECT ipnsName as ipns, replace(ipnsValue, '/ipfs/', '') as cid, key as keyName
      FROM ipns
      WHERE ipnsName IS NOT NULL
    `);

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Republishing ${ipnsRes.length} IPNS records!`,
    );

    // batch data
    const batchedData = [];
    let batch = [];
    for (let i = 0; i < ipnsRes.length; i++) {
      batch.push(ipnsRes[i]);
      if (batch.length === 10) {
        batchedData.push(batch);
        batch = [];
      }
    }
    if (batch.length) {
      batchedData.push(batch);
    }
    console.log(JSON.stringify(batchedData));
    return batchedData;
  }
  async runExecutor(data: any): Promise<any> {
    console.log(data);
    for (const item of data) {
      await axios.post(
        `${env.STORAGE_IPFS_API}/name/publish?arg=${item.cid}&key=${item.keyName}`,
      );
    }
  }
}
