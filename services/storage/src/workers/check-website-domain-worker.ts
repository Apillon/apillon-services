import { Context, SqlModelStatus, env } from '@apillon/lib';
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
    const batchedData = [];
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
      let batch = [];
      for (let i = 0; i < domains.length; i++) {
        batch.push(domains[i]);
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
  async runExecutor(data: any): Promise<any> {
    console.log('CheckWebsiteDomainWorker data: ', data);
    const lookupResults: { id: number; lookupSuccessful: boolean }[] = [];

    for (const item of data) {
      lookupResults.push({
        id: item.id,
        lookupSuccessful: await checkDomainDns(item.domain),
      });
    }

    // update successfully checked websites
    if (lookupResults.find((x) => x.lookupSuccessful == true)) {
      await this.context.mysql.paramExecute(
        `
       UPDATE \`${DbTables.WEBSITE}\` 
       SET  
        domainLastCheckDate = NOW(),
        domainStatus = ${WebsiteDomainStatus.OK}
       WHERE id IN (${lookupResults
         .filter((x) => x.lookupSuccessful == true)
         .map((x) => x.id)
         .join(',')})
      `,
      );
    }

    // update websites which does not resolve to valid IPs
    if (lookupResults.find((x) => x.lookupSuccessful == false)) {
      await this.context.mysql.paramExecute(
        `
     UPDATE \`${DbTables.WEBSITE}\` 
     SET  domainLastCheckDate = NOW(),
          domainStatus = ${WebsiteDomainStatus.INVALID}
     WHERE id IN (${lookupResults
       .filter((x) => x.lookupSuccessful == false)
       .map((x) => x.id)
       .join(',')})
    `,
      );
    }
  }
}
