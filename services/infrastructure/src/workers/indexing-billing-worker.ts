import {
  AppEnvironment,
  Context,
  env,
  LogType,
  ProductCode,
  runWithWorkers,
  Scs,
  SerializeFor,
  ServiceName,
  SpendCreditDto,
  SqlModelStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { IndexerService } from '../modules/indexer/indexer.service';
import { IndexerBilling } from '../modules/indexer/models/indexer-billing.model';
import { Indexer } from '../modules/indexer/models/indexer.model';
import { sqdApi } from '../modules/indexer/sqd/sqd.api';
import { BillingReceipt } from '../modules/indexer/sqd/types/deploymentResponse';

export class IndexingBillingWorker extends BaseSingleThreadWorker {
  protected context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runExecutor(data?: any): Promise<any> {
    this.logFn(`IndexerStatusWorker - execute BEGIN: ${data}`);

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const day = new Date().getDate();

    const { body } = await sqdApi<{
      items: BillingReceipt[];
      currency: string;
      subTotal: number;
      total: number;
      tax: number;
    }>({
      method: 'GET',
      path: `/orgs/${env.SQD_ORGANIZATION_CODE}/billing/receipts/${year}/${month}?bySquid=true`,
    });

    console.info(body);

    //Group billing receipts by squidId
    const squidIds = [...new Set(body.items.map((item) => item.squidId))];

    await runWithWorkers(
      squidIds,
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
        env.APP_ENV == AppEnvironment.TEST
        ? 1
        : 5,
      this.context,
      async (squidId: string) => {
        let billAmount = body.items
          .filter((item) => item.squidId == squidId)
          .reduce((acc, item) => acc + parseFloat(item.subtotal), 0);

        billAmount = (billAmount * (100 + env.INDEXER_PROVISION_PERCENT)) / 100;
        console.info(`SquidId: ${squidId} - Bill Amount: ${billAmount}`);

        const indexer = await new Indexer({}, this.context).populateBySquidId(
          +squidId,
        );

        /**It is possible that there will be some indexers in sqd cloud, which will not exists in this environment (testing indexers, ...). Skip those... */
        if (!indexer.exists()) {
          console.info(`Indexer with squidId ${squidId} not found`);
          return;
        }

        const conn = await this.context.mysql.start();
        try {
          let indexerBilling = await new IndexerBilling(
            {},
            this.context,
          ).populateByIndexerYearAndMonthForUpdate(
            indexer.id,
            year,
            month,
            conn,
          );

          if (!indexerBilling.exists()) {
            indexerBilling = await new IndexerBilling({}, this.context)
              .populate({
                indexer_id: indexer.id,
                year,
                month,
              })
              .insert(SerializeFor.INSERT_DB, conn);
          }

          console.info(
            'Unbilled amount: ',
            billAmount - indexerBilling.billedAmount,
          );

          //Spend credits
          if (billAmount > indexerBilling.billedAmount) {
            console.info(
              'Spend credits. Amount: ' +
                (billAmount - indexerBilling.billedAmount) * 1000,
            );
            const spendCredit: SpendCreditDto = new SpendCreditDto(
              {
                project_uuid: indexer.project_uuid,
                product_id: ProductCode.INDEXER,
                referenceTable: DbTables.INDEXER,
                referenceId: `${indexer.indexer_uuid}-${year}-${month}-${day}`,
                location: 'IndexingBillingWorker.runExecutor',
                service: ServiceName.INFRASTRUCTURE,
                amount: (billAmount - indexerBilling.billedAmount) * 1000, //1credit = 0.001USD
              },
              this.context,
            );
            await new Scs(this.context).spendCredit(spendCredit);
            indexerBilling.billedAmount = billAmount;
            await indexerBilling.update(SerializeFor.UPDATE_DB, conn);
          }

          //commit the transaction
          await this.context.mysql.commit(conn);
        } catch (error) {
          console.error(error);
          await this.context.mysql.rollback(conn);

          const errorCode = error.code || error.response?.statusCode;
          if (
            errorCode == 40210000 &&
            indexer.status == SqlModelStatus.ACTIVE &&
            indexer.squidReference
          ) {
            console.info('Insufficient credits - hibernate indexer');
            //Insufficient credits - hibernate indexer
            if (env.APP_ENV != AppEnvironment.TEST) {
              const { body } = await sqdApi<any>({
                method: 'POST',
                path: `/orgs/${env.SQD_ORGANIZATION_CODE}/squids/${indexer.squidReference}/hibernate`,
              });
            }

            console.info('hibernate indexer response', body);

            indexer.status = SqlModelStatus.INACTIVE;
            await indexer.update();

            //Note: Price for hibernated indexers is currently unknown. Maybe we will have to implement indexer deletion in the future, if indexer is hibernated for too long.
          } else {
            // Log unexpected error.
            await this.writeEventLog(
              {
                logType: LogType.ERROR,
                project_uuid: indexer.project_uuid,
                message: 'Bill for indexer - failed',
                service: ServiceName.INFRASTRUCTURE,
                data: {
                  indexer: indexer.serialize(),
                  error,
                },
              },
              LogOutput.SYS_ERROR,
            );
          }
        }
      },
    );

    return true;
  }
}
