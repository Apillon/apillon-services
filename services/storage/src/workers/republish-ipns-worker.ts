import { Context, SqlModelStatus, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import axios from 'axios';
import { DbTables } from '../config/types';
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
      SELECT \`ipnsName\` as ipns, replace(ipnsValue, '/ipfs/', '') as cid, \`key\` as keyName, \`project_uuid\`,
      (
        SELECT c.ipfsApi
        FROM \`${DbTables.IPFS_CLUSTER}\` c
        LEFT JOIN \`${DbTables.PROJECT_CONFIG}\` pc 
          ON pc.ipfsCluster_id = c.id
          AND pc.project_uuid = ipns.project_uuid
        WHERE (pc.project_uuid = ipns.project_uuid OR c.isDefault = 1)
        AND c.status = ${SqlModelStatus.ACTIVE}
        ORDER BY c.isDefault ASC
        LIMIT 1
      ) as ipfsApi
      FROM ipns
      WHERE ipnsName IS NOT NULL
      ORDER BY project_uuid
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
          `${item.ipfsApi}/name/publish?arg=${item.cid}&key=${item.keyName}`,
        );
        console.info('IPNS republished', item);
      } catch (error) {
        console.error('Error republishing IPNS.', error, item);
        if (
          error.response?.data?.Message === 'no key by the given name was found'
        ) {
          try {
            console.info(
              'Calling IPFSService.publishToIPNS so that new key will be generated...',
            );
            await new IPFSService(
              this.context,
              item.project_uuid,
            ).generateKeyAndPublishToIPNS(item.cid, item.keyName);
          } catch (error2) {
            console.error('Error in IPFSService.publishToIPNS', error2);
          }
        }
      }
    }
  }
}
