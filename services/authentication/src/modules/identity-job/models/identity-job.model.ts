import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';

import { DbTables } from '../../../config/types';

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
  public identity_id: number;

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
