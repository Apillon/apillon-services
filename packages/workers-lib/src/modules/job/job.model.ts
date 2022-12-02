import {
  booleanParser,
  dateParser,
  integerParser,
  stringParser,
} from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  presenceValidator,
  prop,
  JSONParser,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  ValidatorErrorCode,
} from '@apillon/lib';

import { Context } from '@apillon/lib';
import {
  IWorkerDefinitionOptions,
  WorkerDefinition,
} from '../../lib/serverless-workers';
import { DbTables } from '../../config/types';

export class Job extends AdvancedSQLModel {
  public tableName = DbTables.JOB;

  /**
   * job id
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.WORKER],
    validators: [],
  })
  public id: number;

  /**
   * job name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DEFAULT_VALIDATOR_ERROR_CODE,
      },
    ],
  })
  public name: string;

  /**
   * job channel
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public channel: number;

  /**
   * job interval - cron
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public interval: string;

  /**
   * job last run date - set at the beggining of execution
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public lastRun: Date;

  /**
   * job next run - set at creation or at next interval
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public nextRun: Date;

  /**
   * job timeout
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
    defaultValue: 15 * 60,
  })
  public timeout: number;

  /**
   * job input
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public input: string;

  /**
   * job retries count
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public retries: number;

  /**
   * job duration
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public lastDuration: number;

  /**
   * last error info
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public lastError: string;

  /**
   * time of last successful run - set at the end of execution
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public lastCompleted: Date;

  /**
   * time when last error occured
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public lastFailed: Date;

  /**
   * object with parameters
   */
  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
    defaultValue: {},
  })
  public parameters: any;

  /**
   * autoremove flag - whether to remove after execution
   */
  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public autoRemove: boolean;

  /**
   * executorCount - amount of messages sent to SQS to be processed
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
  })
  public executorCount: boolean;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public async getPendingJobs(): Promise<Array<Job>> {
    const pendingJobs = await this.getContext()
      .mysql.paramExecute(
        `
      SELECT * FROM \`${this.tableName}\`
      WHERE status = ${SqlModelStatus.ACTIVE}
      AND nextRun IS NOT NULL
      AND nextRun <= NOW()
      AND (
        lastRun IS NULL
        OR lastRun <= nextRun
        OR DATE_ADD(lastRun, INTERVAL timeout SECOND) < NOW()
      )
    `,
      )
      .then((rows) => rows.map((x) => new Job(x, this.getContext())));

    console.log(`Found ${pendingJobs.length} pending jobs`);

    if (Array.isArray(pendingJobs)) {
      return pendingJobs;
    } else {
      return [pendingJobs];
    }
  }

  public getWorkerDefinition(): IWorkerDefinitionOptions {
    if (!this.parameters) {
      this.parameters = {};
    }
    this.parameters.channel = this.channel;
    return {
      ...this.serialize(SerializeFor.WORKER),
    };
  }

  public async updateWorkerDefinition(workerDef: WorkerDefinition) {
    await this.populateById(workerDef.id);
    this.populate(workerDef);
    await this.update(SerializeFor.INSERT_DB);
  }

  public async getExecutorCount() {
    const query = `SELECT executorCount FROM ${this.tableName} WHERE id = @id;`;
    const response = await this.getContext().mysql.paramExecute(query, {
      id: this.id,
    });
    return response && response.length ? response[0] : null;
  }

  public async getJobsWithParameters(
    workerName: string,
    parameters: any,
    nextRunBefore: Date = null,
    nextRunAfter: Date = new Date(),
  ) {
    let jsonQuery = '';
    for (const key of Object.keys(parameters)) {
      if (jsonQuery) {
        jsonQuery += ' AND ';
      }
      if (Number(parameters[key])) {
        jsonQuery += `parameters->"$.${key}" = ${parameters[key]}\n`;
      } else {
        jsonQuery += `parameters->"$.${key}" = "${parameters[key]}"\n`;
      }
    }
    const resp = await this.db().paramExecute(
      `
      SELECT * 
      FROM ${this.tableName}
      WHERE name = @workerName
      AND status = 5
      AND ${jsonQuery}
      AND (@nextRunBefore IS NULL OR nextRun < @nextRunBefore)
      AND (@nextRunAfter IS NULL OR nextRun > @nextRunAfter)
    `,
      { workerName, nextRunAfter, nextRunBefore },
    );
    if (resp.length) {
      return resp.map((x) => new Job(x, this.getContext()));
    } else {
      return [];
    }
  }
}
