import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';

import { DbTables, IDENTITY_JOB_MAX_RETRIES } from '../../../config/types';

export class IdentityJob extends AdvancedSQLModel {
  public readonly tableName = DbTables.IDENTITY_JOB;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public identity_key: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public retries: number;

  /**
   * Current stage of the identity generation process
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public currentStage: string;

  /**
   * setComplete when this stage is reached (currentStage == finalStage)
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public finalStage: string;

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
  public completedAt: Date;

  /**
   * Sets completed property when the job if completed
   */
  public async setCompleted() {
    this.completedAt = new Date();
    await this.update();
  }

  /**
   * Sets current job state
   */
  public async setCurrentStage(stage: string) {
    this.currentStage = stage;
    this.retries = 0;
    await this.update();
  }

  /**
   * Sets final stage
   */
  public async isFinalStage() {
    return this.currentStage === this.finalStage;
  }

  /**
   * Sets failed date and increments retires or sets to 1
   */
  public async setFailed() {
    this.lastFailed = new Date();
    this.retries = this.retries ? ++this.retries : 1;
    await this.update();
  }

  /**
   * Returns true if job can be retires, false otherwise
   */
  public async identityJobRetry() {
    return this.retries === null || this.retries <= IDENTITY_JOB_MAX_RETRIES;
  }

  public async populateByIdentityKey(identity_key: number) {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${this.tableName}\`
        WHERE identity_key = @identity_key;
        `,
      { identity_key },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }
}
