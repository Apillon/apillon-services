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
  private recordLimit = 20;

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
    const conn = await this.context.mysql.start();
    try {
      const domains = await this.context.mysql.paramExecute(
        `
        SELECT w.* 
        from \`${DbTables.WEBSITE}\` w
        WHERE w.status <> ${SqlModelStatus.DELETED}
        AND w.domainStatus <> ${WebsiteDomainStatus.CHECKING}
        AND (w.domainLastCheckDate IS NULL OR DATE_ADD(w.domainLastCheckDate,INTERVAL 24 HOUR) < NOW())
        AND TRIM(IFNULL(w.domain,'')) <> ''
        ORDER BY domainLastCheckDate ASC
        LIMIT ${this.recordLimit}
    `,
        {},
        conn,
      );

      await this.writeLogToDb(
        WorkerLogStatus.INFO,
        `Resolving ${domains.length} Domains!`,
      );

      if (domains.length) {
        // lock the records for following jobs
        await this.context.mysql.paramExecute(
          `
        UPDATE \`${DbTables.WEBSITE}\` 
        SET domainStatus = ${WebsiteDomainStatus.CHECKING}
        WHERE id IN (${domains.map((x) => x.id).join(',')})
        `,
          conn,
        );
      }

      await this.context.mysql.commit(conn);

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
      await this.context.mysql.rollback(conn);
      await this.writeLogToDb(
        WorkerLogStatus.ERROR,
        `Error resolving website domains`,
        null,
        err,
      );
    }

    return [];
  }
  async runExecutor(data: any): Promise<any> {
    console.log('ResolveWebsiteDomainWorker data: ', data);
    const lookupResults: { id: number; lookupSuccessful: boolean }[] = [];

    for (const item of data) {
      lookupResults.push({
        id: item.id,
        lookupSuccessful: await checkDomainDns(item.domain),
      });
    }

    // update successfully resolved websites
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
