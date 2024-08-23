import { Context, SqlModelStatus, env, splitArray } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { DbTables, WebsiteDomainStatus } from '../config/types';
import { checkDomainDns } from '../lib/domains';

export class CheckWebsiteDomainWorker extends BaseQueueWorker {
  private recordLimit = 100;

  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.STORAGE_AWS_WORKER_SQS_URL);
    this.recordLimit = workerDefinition.parameters?.recordLimit ?? 20;
  }
  async runPlanner(data?: any): Promise<any[]> {
    try {
      //Get domains which were not yet checked, were not checked in last 24hours or has changed domain in last 6hours
      const domains = await this.context.mysql.paramExecute(
        `
        SELECT w.* 
        from \`${DbTables.WEBSITE}\` w
        WHERE w.status <> ${SqlModelStatus.DELETED}
        AND TRIM(IFNULL(w.domain,'')) <> ''
        AND w.domainStatus <> ${WebsiteDomainStatus.HAS_CDN}
        AND (
          w.domainLastCheckDate IS NULL 
          OR DATE_ADD(w.domainLastCheckDate,INTERVAL 24 HOUR) < NOW()
          OR DATE_ADD(w.domainChangeDate, INTERVAL 6 HOUR) > NOW()
        )
        ORDER BY domainLastCheckDate ASC
        LIMIT ${this.recordLimit}
    `,
        {},
      );

      await this.writeLogToDb(
        WorkerLogStatus.INFO,
        `Checking ${domains.length} domains!`,
      );

      // batch data
      const batchedData = splitArray(domains, 10);
      console.log(JSON.stringify(batchedData));
      return batchedData;
    } catch (err) {
      await this.writeLogToDb(
        WorkerLogStatus.ERROR,
        `Error checking website domains`,
        null,
        err,
      );
    }

    return [];
  }
  async runExecutor(
    data: { id: number; domain: string; website_uuid: string }[],
  ): Promise<void> {
    console.log('CheckWebsiteDomainWorker data: ', data);
    const lookupResults: { id: number; lookupSuccessful: boolean }[] = [];

    for (const item of data) {
      lookupResults.push({
        id: item.id,
        lookupSuccessful: await checkDomainDns(item.domain),
      });
    }

    const successfulIds = [
      -1,
      ...lookupResults.filter((x) => x.lookupSuccessful).map((x) => x.id),
    ];

    // update checked websites
    await this.context.mysql.paramExecute(
      `
     UPDATE \`${DbTables.WEBSITE}\` 
     SET  
      domainLastCheckDate = NOW(),
      domainStatus = CASE WHEN id IN (${successfulIds.join(',')}) 
        THEN ${WebsiteDomainStatus.OK} 
        ELSE ${WebsiteDomainStatus.INVALID} 
      END
     WHERE id IN (${lookupResults.map((x) => x.id).join(',')})
    `,
    );
  }
}
