import {
  PoolConnection,
  PopulateFrom,
  ProjectAccessModel,
  SerializeFor,
  SqlModelStatus,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { ConfigErrorCode, DbTables } from '../../../config/types';

export class Credit extends ProjectAccessModel {
  public readonly tableName = DbTables.CREDIT;

  /**
   * Updated at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.PROFILE, SerializeFor.SELECT_DB],
    populatable: [PopulateFrom.DB],
  })
  public updateTime?: Date;

  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.PROFILE, SerializeFor.SELECT_DB],
    populatable: [PopulateFrom.DB],
  })
  public createTime?: Date;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.LOGGER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.CREDIT_QUOTA_UUID_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public project_uuid: string;

  /**
   * current balance
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.LOGGER,
      SerializeFor.APILLON_API,
    ],
  })
  public balance: number;

  /**
   * Populate model. Use this for simple reads.
   * @param uuid project_uuid
   * @returns
   */
  public override async populateByUUID(uuid: string): Promise<this> {
    return super.populateByUUID(uuid, 'project_uuid');
  }

  /**
   * Populate model with FOR UPDATE statement
   * NOTE: Use this population method, when credit balance will be changed
   * @param project_uuid
   * @returns
   */
  public async populateByProjectUUIDForUpdate(
    project_uuid: string,
    conn: PoolConnection,
  ): Promise<this> {
    if (!project_uuid) {
      throw new Error(`project_uuid should not be null: ${project_uuid}`);
    }

    const data = await this.getContext().mysql.paramExecute(
      `
          SELECT ${this.generateSelectFields()}
          FROM \`${DbTables.CREDIT}\`
          WHERE project_uuid = @project_uuid
          AND status <> ${SqlModelStatus.DELETED}
          FOR UPDATE;
        `,
      { project_uuid },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
