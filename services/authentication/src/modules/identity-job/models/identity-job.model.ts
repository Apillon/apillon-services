import {
  AdvancedSQLModel,
  Context,
  JSONParser,
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

  /**
   * Foreign key of the identity table
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.WORKER],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
    validators: [],
  })
  public identity_id: number;

  /**
   * Number of times this job retired
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public retries: number;

  /**
   * Current state of the identity generation process
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public state: string;

  /**
   * Final state of the identity generation process
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.WORKER],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
    validators: [],
  })
  public finalState: string;

  /**
   * Time when last error occured
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public lastFailed: Date;

  /**
   * Last error info
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public lastError: string;

  /**
   * Data needed for this job to execute
   */
  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.WORKER],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public data: any;

  /**
   * Time of last successful run - set at the end of execution
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.WORKER],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public completedAt: Date;

  /**
   * Sets state to finalState property when the job if completed
   */
  public async setCompleted() {
    this.completedAt = new Date();
    this.state = this.finalState;
    await this.update();
  }

  /**
   * Sets current job state
   */
  public async setState(state: string) {
    this.state = state;
    this.retries = 0;
    await this.update();
  }

  /**
   * Sets final stage
   */
  public async isFinalState() {
    return this.state === this.finalState;
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

  public async populateByIdentityId(identity_id: number) {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${this.tableName}\`
        WHERE identity_id = @identity_id;
        `,
      { identity_id },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }
}
