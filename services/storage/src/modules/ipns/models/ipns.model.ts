import {
  ProjectAccessModel,
  Context,
  env,
  getQueryParams,
  IpnsQueryFilter,
  PopulateFrom,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { StorageCodeException } from '../../../lib/exceptions';
import { Bucket } from '../../bucket/models/bucket.model';

export class Ipns extends ProjectAccessModel {
  public readonly tableName = DbTables.IPNS;

  public constructor(data: any, context: Context) {
    super(data, context);
  }
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPNS_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

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
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPNS_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public bucket_id: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPNS_NAME_NOT_PRESENT,
      },
    ],
    fakeValue: `My fake IPNS ${Math.floor(Math.random() * 1_000_000)}`,
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
    fakeValue: 'Ipns record description',
  })
  public description: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public ipnsName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public ipnsValue: string;

  public async populateByProjectAndName(
    project_uuid: string,
    name: string,
  ): Promise<this> {
    if (!project_uuid || !name) {
      throw new Error('params should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE project_uuid = @project_uuid and name = @name AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid, name },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getList(context: ServiceContext, filter: IpnsQueryFilter) {
    const b: Bucket = await new Bucket({}, context).populateById(
      filter.bucket_id,
    );
    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    this.project_uuid = b.project_uuid;

    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'b.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'i',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('i', '')},
        IF(i.ipnsName IS NULL, NULL, CONCAT("${env.STORAGE_IPFS_GATEWAY.replace(
          '/ipfs/',
          '/ipns/',
        )}", i.ipnsName)) as link,
        i.updateTime
        `,
      qFrom: `
        FROM \`${DbTables.IPNS}\` i
        WHERE i.project_uuid = @project_uuid
        AND i.bucket_id = @bucket_id
        AND (@search IS null OR i.name LIKE CONCAT('%', @search, '%'))
        AND status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      { ...params, project_uuid: this.project_uuid },
      'i.id',
    );
  }
}
