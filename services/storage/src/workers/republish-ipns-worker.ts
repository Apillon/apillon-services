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
    const filteredData = [];
    const ipnsRes = await this.context.mysql.paramExecute(`
      SELECT ipnsName as ipns, replace(ipnsValue, '/ipfs/', '') as cid
      FROM ipns
      WHERE ipnsName IS NOT NULL
      UNION
      SELECT IPNS as ipns, CID as cid 
      FROM bucket
      WHERE IPNS IS NOT NULL 
    `);

    const keys = (await axios.post(`${env.STORAGE_IPFS_API}/key/list`)).data
      ?.Keys as Array<any>;

    for (const ipns of ipnsRes) {
      const key = keys.find((x) => x.Id === ipns.ipns);
      if (!!key) {
        filteredData.push({ ...ipns, keyName: key.Name });
      }
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `Republishing ${filteredData.length} IPNS records!`,
    );

    // batch data
    const batchedData = [];
    let batch = [];
    for (let i = 0; i < filteredData.length; i++) {
      batch.push(filteredData[i]);
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
