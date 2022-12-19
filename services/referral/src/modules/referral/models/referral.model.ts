import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  Context,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables, ReferralErrorCode } from '../../../config/types';

export class Referral extends AdvancedSQLModel {
  public readonly tableName = DbTables.REFERRAL;

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
  public user_id: number;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
  })
  public referral_code: string;

  /**
   * Populates model fields by loading the document with the provided user id from the database.
   * @param user_id Referr's user ID.
   */
  public async populateByUserId(
    user_id: number | string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!user_id) {
      throw new Error('User ID should not be null');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${DbTables.REFERRAL}\`
      WHERE user_id = @user_id AND status <> ${SqlModelStatus.DELETED};
      `,
      { user_id },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }
  /*public async getList(context: ServiceContext, query: BucketQueryFilter) {
    const params = {
      project_uuid: query.project_uuid,
      search: query.search,
    };

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('b', '')}
        `,
      qFrom: `
        FROM \`${DbTables.BUCKET}\` b
        WHERE (@search IS null OR b.name LIKE CONCAT('%', @search, '%'))
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'b.id');
  }*/
}
