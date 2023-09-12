import { Context, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import axios from 'axios';
import { IPFSService } from '../modules/ipfs/ipfs.service';

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
      SELECT \`ipnsName\` as ipns, replace(ipnsValue, '/ipfs/', '') as cid, \`key\` as keyName
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
    console.log('RepublishIpnsWorker data: ', data);
    for (const item of data) {
      try {
        await axios.post(
          `${env.STORAGE_IPFS_API}/name/publish?arg=${item.cid}&key=${item.keyName}`,
        );
        console.info('IPNS republished', item);
      } catch (error) {
        console.error('Error republishing IPNS.', error, item);
        if (error.data.Message === 'no key by the given name was found') {
          try {
            console.info(
              'Calling IPFSService.publishToIPNS so that new key will be generated...',
            );
            await IPFSService.publishToIPNS(item.cid, item.keyName);
          } catch (error2) {
            console.error('Error in IPFSService.publishToIPNS', error2);
          }
        }
      }
    }
  }
}
