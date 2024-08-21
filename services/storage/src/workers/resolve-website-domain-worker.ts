import { IpfsKuboRpcHttpClient } from '@apillon/ipfs-kubo-rpc-http-client';
import { Context, SqlModelStatus, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { DbTables, WebsiteDomainStatus } from '../config/types';
import { IPFSService } from '../modules/ipfs/ipfs.service';
import dns from 'node:dns';

export class ResolveWebsiteDomainWorker extends BaseQueueWorker {
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
        AND w.domainStatus <> ${WebsiteDomainStatus.RESOLVING}
        AND (w.domainLastResolveDate IS NULL OR DATE_ADD(w.domainLastResolveDate,INTERVAL 24 HOUR) < NOW())
        AND TRIM(IFNULL(w.domain,'')) <> ''
        ORDER BY domainLastResolveDate ASC
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
        SET domainStatus = ${WebsiteDomainStatus.RESOLVING}
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
        domainLastResolveDate = NOW(),
        domainStatus = ${WebsiteDomainStatus.RESOLVED}
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
     SET  domainLastResolveDate = NOW(),
          domainStatus = ${WebsiteDomainStatus.UNRESOLVED}
     WHERE id IN (${lookupResults
       .filter((x) => x.lookupSuccessful == false)
       .map((x) => x.id)
       .join(',')})
    `,
      );
    }
  }
}

async function checkDomainDns(domain: string): Promise<boolean> {
  const validIps = env.VALID_WEBSITE_DOMAIN_TARGETS || [];

  if (!validIps.length) {
    console.log('[WARNING] NO VALID DOMAIN TARGETS IS SET!');
    return true;
  }

  const { address } = await dns.promises.lookup(domain).catch((err) => {
    console.error(`Error resolving DNS domain: ${err}`);
    return { address: null };
  });

  if (validIps.includes(address)) {
    return true;
  }
  console.log(`Domain does not not resolve to valid IP!`);
  return false;
}
