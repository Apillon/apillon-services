import {
  Context,
  EmbeddedWalletSignaturesQueryFilter,
  PopulateFrom,
  ProjectAccessModel,
  SerializeFor,
  SqlModelStatus,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { AuthenticationErrorCode, DbTables } from '../../../config/types';
import { EmbeddedWalletIntegration } from './embedded-wallet-integration.model';
import { AuthenticationCodeException } from '../../../lib/exceptions';

export class OasisSignature extends ProjectAccessModel {
  public readonly tableName = DbTables.OASIS_SIGNATURE;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  @prop({
    parser: { resolver: integerParser() },
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
  public embeddedWalletIntegration_id: string;

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
  public contractAddress: string;

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
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public createTime: Date;

  public async getNumOfSignaturesForCurrentMonth(): Promise<number> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT COUNT(*) as numOfSignatures
        FROM \`${DbTables.OASIS_SIGNATURE}\`
        WHERE project_uuid = @project_uuid
        AND status IN (${SqlModelStatus.ACTIVE}, ${SqlModelStatus.INACTIVE})
        AND month(createTime) = month(curdate());
      `,
      { project_uuid: this.project_uuid },
    );

    return data[0].numOfSignatures;
  }

  public async getList(
    context: ServiceContext,
    filter: EmbeddedWalletSignaturesQueryFilter,
  ) {
    await new EmbeddedWalletIntegration(
      {},
      context,
    ).populateByUUIDAndCheckAccess(filter.integration_uuid);

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
        JOIN \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\` i on i.id = o.embeddedWalletIntegration_id
        WHERE i.integration_uuid = @integration_uuid
        AND o.status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'o.id');
  }

  public async populateByPublicAddress(publicAddress: string) {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT ${this.generateSelectFields('o', '', SerializeFor.SELECT_DB)}
        FROM \`${DbTables.OASIS_SIGNATURE}\` o
        WHERE UPPER(o.publicAddress) = UPPER(@publicAddress)
        AND o.status = ${SqlModelStatus.ACTIVE}
        LIMIT 1;
      `,
      { publicAddress },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
