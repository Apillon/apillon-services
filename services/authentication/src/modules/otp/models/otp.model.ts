import {
  BaseSQLModel,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import {
  integerParser,
  stringParser,
  dateParser,
  booleanParser,
} from '@rawmodel/parsers';

/**
 * Used to store one-time passwords for authentication of users.
 */
export class Otp extends BaseSQLModel {
  public readonly tableName = DbTables.OTP;

  public constructor(data: any, context: any) {
    super(data, context);
  }

  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  /**
   * Email
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public email: string;

  /**
   * Code
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public code: string;

  /**
   * ExpireTime
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public expireTime: Date;

  /**
   * Used
   */
  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    defaultValue: false,
  })
  public used: boolean;

  /**
   * Created at
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      // SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      // SerializeFor.ADMIN,
      // SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public createTime?: Date;

  /**
   * Updated at
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      // SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      // SerializeFor.ADMIN,
      // SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public updateTime?: Date;

  /**
   * Tells if the model represents a document stored in the database.
   */
  public exists(): boolean {
    return !!this.id;
  }

  public async populateActiveByEmailAndCode(
    email: string,
    code: string,
  ): Promise<this> {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM ${this.tableName} WHERE email = @email AND CODE = @code AND used = false and expireTime > NOW()`,
      {
        email,
        code,
      },
    );
    data?.length ? this.populate(data[0], PopulateFrom.DB) : this.reset();

    return this;
  }

  /**
   * Updates model data in the database.
   */
  public async update(
    strategy: SerializeFor = SerializeFor.UPDATE_DB,
    conn?: PoolConnection,
  ): Promise<this> {
    const serializedModel = this.serialize(strategy);

    // remove non-updatable parameters
    delete serializedModel.id;
    delete serializedModel.createTime;
    delete serializedModel.updateTime;

    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }

    try {
      const createQuery = `
        UPDATE \`${this.tableName}\`
        SET
          ${Object.keys(serializedModel)
            .map((x) => `\`${x}\` = @${x}`)
            .join(',\n')}
        WHERE id = @id
        `;

      // re-set id parameter for where clause.
      serializedModel.id = this.id;

      await this.getContext().mysql.paramExecute(
        createQuery,
        serializedModel,
        conn,
      );

      if (isSingleTrans) {
        await this.getContext().mysql.commit(conn);
      }
    } catch (err) {
      if (isSingleTrans) {
        await this.getContext().mysql.rollback(conn);
      }
      throw new Error(err);
    }

    return this;
  }
}
