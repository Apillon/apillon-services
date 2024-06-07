import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  presenceValidator,
  prop,
  OasisSignaturesQueryFilter,
  ProjectAccessModel,
  getQueryParams,
  ApiName,
  selectAndCountQuery,
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { AuthenticationErrorCode, DbTables } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class OasisSignature extends ProjectAccessModel {
  public readonly tableName = DbTables.OASIS_SIGNATURE;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.OASIS_SIGNATURE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.OASIS_SIGNATURE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public dataHash: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public hashedUsername: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public publicAddress: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public apiKey: string;

  public async signaturesByApiKey(): Promise<
    { apiKey: string; numOfSignatures: number }[]
  > {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT apiKey, COUNT(*) as numOfSignatures
        FROM \`${DbTables.OASIS_SIGNATURE}\`
        WHERE project_uuid = @project_uuid
        AND status IN (${SqlModelStatus.ACTIVE}, ${SqlModelStatus.INACTIVE});
      `,
      { project_uuid: this.project_uuid },
    );

    return data;
  }

  public async getList(
    context: ServiceContext,
    filter: OasisSignaturesQueryFilter,
  ) {
    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'o.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'o',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('o', '', SerializeFor.SELECT_DB)}
        `,
      qFrom: `
        FROM \`${DbTables.OASIS_SIGNATURE}\` o
        WHERE o.project_uuid = IFNULL(@project_uuid, o.project_uuid)
        AND status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'o.id');
  }
}
