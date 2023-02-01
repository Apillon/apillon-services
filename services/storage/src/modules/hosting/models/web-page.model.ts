import {
  AdvancedSQLModel,
  CodeException,
  Context,
  DefaultUserRole,
  env,
  ForbiddenErrorCodes,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  WebPageQueryFilter,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '../../../context';
import { Bucket } from '../../bucket/models/bucket.model';

export class WebPage extends AdvancedSQLModel {
  public readonly tableName = DbTables.WEB_PAGE;

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
        code: StorageErrorCode.WEB_PAGE_PROJECT_UUID_NOT_PRESENT,
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
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.WEB_PAGE_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public bucket_id: number;

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
        code: StorageErrorCode.WEB_PAGE_STAGING_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public stagingBucket_id: number;

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
        code: StorageErrorCode.WEB_PAGE_PRODUCTION_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public productionBucket_id: number;

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
        code: StorageErrorCode.WEB_PAGE_NAME_NOT_PRESENT,
      },
    ],
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
  public domain: string;

  /***************************************************
   * Info properties
   *****************************************************/
  @prop({
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public ipnsStagingLink: string;

  @prop({
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public ipnsProductionLink: string;

  @prop({
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public bucket: Bucket;

  @prop({
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public stagingBucket: Bucket;

  @prop({
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public productionBucket: Bucket;

  public canAccess(context: ServiceContext) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }

  public canModify(context: ServiceContext) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissions to modify this record',
      });
    }
  }

  /**
   * Function to get count of active web pages inside project
   * @param project_uuid
   * @param bucketType
   * @returns
   */
  public async getNumOfWebPages() {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT COUNT(*) as numOfPages
      FROM \`${this.tableName}\`
      WHERE project_uuid = @project_uuid 
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid: this.project_uuid },
    );

    return data[0].numOfPages;
  }

  public async getList(context: ServiceContext, filter: WebPageQueryFilter) {
    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'wp.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'wp',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('wp', '')}, wp.updateTime
        `,
      qFrom: `
        FROM \`${DbTables.WEB_PAGE}\` wp
        WHERE wp.project_uuid = @project_uuid
        AND (@search IS null OR wp.name LIKE CONCAT('%', @search, '%'))
        AND IFNULL(@status, ${SqlModelStatus.ACTIVE}) = status
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'wp.id');
  }

  public async populateBucketsAndLink() {
    if (this.bucket_id) {
      this.bucket = await new Bucket({}, this.getContext()).populateById(
        this.bucket_id,
      );
    }
    if (this.stagingBucket_id) {
      this.stagingBucket = await new Bucket({}, this.getContext()).populateById(
        this.stagingBucket_id,
      );
      this.ipnsStagingLink =
        env.STORAGE_IPFS_GATEWAY.replace('/ipfs/', '/ipns/') +
        this.stagingBucket.IPNS;
    }
    if (this.productionBucket_id) {
      this.productionBucket = await new Bucket(
        {},
        this.getContext(),
      ).populateById(this.productionBucket_id);
      this.ipnsProductionLink =
        env.STORAGE_IPFS_GATEWAY.replace('/ipfs/', '/ipns/') +
        this.productionBucket.IPNS;
    }
  }

  public async listDomains(context: ServiceContext) {
    return await context.mysql.paramExecute(
      `
        SELECT wp.domain
        FROM \`${this.tableName}\` wp
        JOIN \`${DbTables.BUCKET}\` b ON b.id = wp.productionBucket_id
        WHERE wp.domain IS NOT NULL
        AND b.CID IS NOT NULL
        AND wp.status <> ${SqlModelStatus.DELETED};
        `,
      {},
    );
  }
}
