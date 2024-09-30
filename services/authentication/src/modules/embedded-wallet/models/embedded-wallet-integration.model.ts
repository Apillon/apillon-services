import {
  BaseProjectQueryFilter,
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
  compareDatesWithoutTime,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import {
  AuthenticationErrorCode,
  DbTables,
  ResourceNotFoundErrorCode,
} from '../../../config/types';
import { AuthenticationCodeException } from '../../../lib/exceptions';

export class EmbeddedWalletIntegration extends UuidSqlModel {
  public readonly tableName = DbTables.EMBEDDED_WALLET_INTEGRATION;

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
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.EMBEDDED_WALLET_INTEGRATION_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public integration_uuid: string;

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
        code: AuthenticationErrorCode.EMBEDDED_WALLET_INTEGRATION_REQUIRED_DATA_NOT_PRESENT,
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
        code: AuthenticationErrorCode.EMBEDDED_WALLET_INTEGRATION_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public title: string;

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
  public description: string;

  public async populateByUUIDAndCheckAccess(uuid: string): Promise<this> {
    if (!uuid) {
      throw new Error(`uuid should not be null: ${uuid}`);
    }

    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\`
        WHERE integration_uuid = @uuid
        AND status <> ${SqlModelStatus.DELETED};
      `,
      { uuid },
    );

    data?.length ? this.populate(data[0], PopulateFrom.DB) : this.reset();

    if (!this.exists()) {
      throw new AuthenticationCodeException({
        status: 404,
        code: ResourceNotFoundErrorCode.EMBEDDED_WALLET_INTEGRATION_NOT_FOUND,
      });
    }

    this.canAccess(this.getContext());

    return this;
  }

  public async getNumOfIntegrations(): Promise<number> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT COUNT(*) as numOfIntegrations
        FROM \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\`
        WHERE project_uuid = @project_uuid
        AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid: this.project_uuid },
    );

    return data[0].numOfIntegrations;
  }

  public async getUsageByDay(
    dateFrom: Date,
  ): Promise<{ date: Date; countOfSignatures: number }[]> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT DATE(createTime) date, COUNT(*) as countOfSignatures
        FROM \`${DbTables.OASIS_SIGNATURE}\`
        WHERE embeddedWalletIntegration_id = @id
        AND status IN (${SqlModelStatus.ACTIVE}, ${SqlModelStatus.INACTIVE})
        GROUP BY DATE(createTime)
      `,
      { id: this.id },
    );

    const usage: { date: Date; countOfSignatures: number }[] = [];
    for (
      const tmpDate = new Date(dateFrom);
      tmpDate <= new Date();
      tmpDate.setDate(tmpDate.getDate() + 1)
    ) {
      usage.push({
        date: tmpDate,
        countOfSignatures:
          data.find((x) => compareDatesWithoutTime(x.date, tmpDate))
            ?.countOfSignatures || 0,
      });
    }

    return usage;
  }

  public async getList(
    context: ServiceContext,
    filter: BaseProjectQueryFilter,
  ) {
    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'i.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'i',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
          SELECT ${this.generateSelectFields('i', '', SerializeFor.SELECT_DB)},
          (
            SELECT COUNT(*) FROM \`${DbTables.OASIS_SIGNATURE}\` s
            WHERE s.embeddedWalletIntegration_id = i.id
            AND status IN (${SqlModelStatus.ACTIVE}, ${SqlModelStatus.INACTIVE})
            AND month(s.createTime) = month(curdate())
          ) as numOfSignatures
          `,
      qFrom: `
          FROM \`${DbTables.EMBEDDED_WALLET_INTEGRATION}\` i
          WHERE i.project_uuid = IFNULL(@project_uuid, i.project_uuid)
          AND status <> ${SqlModelStatus.DELETED}
        `,
      qFilter: `
          ORDER BY ${filters.orderStr}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'i.id');
  }
}
