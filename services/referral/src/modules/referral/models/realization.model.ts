import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  Context,
  JSONParser,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables, ReferralErrorCode } from '../../../config/types';

export class Realization extends AdvancedSQLModel {
  public readonly tableName = DbTables.REALIZATION;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
  })
  public task_id: number;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
  })
  public player_id: number;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
  })
  public reward: number;

  @prop({
    parser: { resolver: JSONParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public data: any;

  public async populateByTaskIdAndPlayerId(
    task_id: number,
    player_id: number,
    data: any = null,
    showDeleted = false,
    conn?: PoolConnection,
  ): Promise<Realization[]> {
    if (!task_id || !player_id) {
      throw new Error('Task ID and player ID should not be null');
    }

    this.reset();

    const res = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.REALIZATION}\`
      WHERE task_id = @task_id 
      AND player_id = @player_id 
      AND (@data IS NULL OR data <> @data)
      ${showDeleted ? '' : `AND status <> ${SqlModelStatus.DELETED}`};
      `,
      { task_id, player_id, showDeleted, data },
      conn,
    );

    if (res && res.length) {
      const arr = [] as Realization[];
      for (const r of res) {
        arr.push(
          new Realization({}, this.getContext()).populate(r, PopulateFrom.DB),
        );
      }
      this.populate(res[0], PopulateFrom.DB);
      return arr;
    } else {
      this.reset();
      return [];
    }
  }
}
