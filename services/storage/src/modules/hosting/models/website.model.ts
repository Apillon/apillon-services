import {
  ApiName,
  Context,
  DomainQueryFilter,
  Lmas,
  LogType,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
  UuidSqlModel,
  WebsiteQueryFilter,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import {
  BucketType,
  DbTables,
  DeploymentEnvironment,
  StorageErrorCode,
  WebsiteDomainStatus,
} from '../../../config/types';
import { StorageValidationException } from '../../../lib/exceptions';
import { addJwtToIPFSUrl } from '../../../lib/ipfs-utils';
import { Bucket } from '../../bucket/models/bucket.model';
import { ProjectConfig } from '../../config/models/project-config.model';

export class Website extends UuidSqlModel {
  public readonly tableName = DbTables.WEBSITE;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.WEBSITE_UUID_NOT_PRESENT,
      },
    ],
  })
  public website_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.WEBSITE_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.WEBSITE_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public bucket_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.WEBSITE_STAGING_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public stagingBucket_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.WEBSITE_PRODUCTION_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public productionBucket_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.WEBSITE_NAME_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public description: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public domain: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public domainChangeDate: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public domainLastCheckDate?: Date;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
    defaultValue: WebsiteDomainStatus.PENDING,
  })
  public domainStatus: WebsiteDomainStatus;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    validators: [],
  })
  public cdnId: string;

  /***************************************************
   * Info properties
   *****************************************************/
  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public bucket_uuid: string;

  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public w3StagingLink: string;

  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public w3ProductionLink: string;

  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public cidStaging: string;

  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public cidProduction: string;

  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public ipnsProduction: string;

  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public bucket: Bucket;

  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public stagingBucket: Bucket;

  @prop({
    populatable: [PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public productionBucket: Bucket;

  @prop({
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public lastDeployment_uuid: string;

  @prop({
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public lastDeploymentStatus: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public repoId: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public branchName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public buildCommand: string | null;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public installCommand: string | null;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
  })
  public buildDirectory: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public apiKey: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public deploymentConfig_websiteUuid: string;

  /**
   * Populate by id or by uuid
   * @param id id or uuid.
   * @param conn
   * @returns
   */
  public override async populateById(
    id: number | string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!id) {
      throw new Error('ID should not be null');
    }

    if (!('id' in this)) {
      throw new Error('Object does not contain id property');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT w.*,dc.repoId, dc.branchName, dc.buildCommand,dc.buildDirectory, dc.installCommand, dc.apiKey, dc.repoName,
      lastDeployment.deployment_uuid as lastDeployment_uuid,
      lastDeployment.deploymentStatus as lastDeploymentStatus
      FROM \`${DbTables.WEBSITE}\` w
      LEFT JOIN (
        SELECT  website_id, deployment_uuid, deploymentStatus from \`${DbTables.DEPLOYMENT}\` d
        ORDER BY d.createTime DESC
      ) as lastDeployment ON lastDeployment.website_id = w.id
      LEFT JOIN \`${DbTables.DEPLOYMENT_CONFIG}\` dc ON dc.websiteUuid = w.website_uuid AND dc.status <> ${SqlModelStatus.DELETED}
      WHERE ( w.id LIKE @id OR w.website_uuid LIKE @id)
      AND w.status <> ${SqlModelStatus.DELETED}
      LIMIT 1;
      `,
      { id },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public override async populateByUUID(uuid: string): Promise<this> {
    return this.populateById(uuid);
  }

  /**
   * Populates only basic website properties from website table. For additional info, call populate by uuid or id.
   * @param domain
   * @param conn
   * @returns
   */
  public async populateByDomain(
    domain: string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!domain) {
      throw new Error('domain should not be null');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT w.*
      FROM \`${DbTables.WEBSITE}\` w
      WHERE w.domain LIKE @domain
      AND w.status <> ${SqlModelStatus.DELETED}
      LIMIT 1;
      `,
      { domain },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  /**
   * Generates buckets for hosting, executes validation and inserts new records
   * @param context
   * @returns created web site, populated with buckets
   */
  public async createNewWebsite(
    context: ServiceContext,
    website_uuid: string,
  ): Promise<this> {
    //Initialize buckets
    const bucket: Bucket = new Bucket(
      {
        bucket_uuid: uuidV4(),
        project_uuid: this.project_uuid,
        bucketType: BucketType.HOSTING,
        name: this.name,
      },
      context,
    );
    await bucket.validateOrThrow(StorageValidationException);

    const stagingBucket: Bucket = new Bucket(
      {
        bucket_uuid: uuidV4(),
        project_uuid: this.project_uuid,
        bucketType: BucketType.HOSTING,
        name: `${this.name}_staging`,
      },
      context,
    );
    await stagingBucket.validateOrThrow(StorageValidationException);

    const productionBucket: Bucket = new Bucket(
      {
        bucket_uuid: uuidV4(),
        project_uuid: this.project_uuid,
        bucketType: BucketType.HOSTING,
        name: `${this.name}_production`,
      },
      context,
    );
    await productionBucket.validateOrThrow(StorageValidationException);

    const conn = await context.mysql.start();

    try {
      //Insert buckets
      await Promise.all([
        bucket.insert(SerializeFor.INSERT_DB, conn),
        stagingBucket.insert(SerializeFor.INSERT_DB, conn),
        productionBucket.insert(SerializeFor.INSERT_DB, conn),
      ]);
      //Populate website
      this.populate({
        website_uuid,
        bucket_uuid: bucket.bucket_uuid,
        bucket_id: bucket.id,
        stagingBucket_id: stagingBucket.id,
        productionBucket_id: productionBucket.id,
        bucket,
        stagingBucket,
        productionBucket,
        domainChangeDate: this.domain ? new Date() : undefined,
        createTime: new Date(),
        updateTime: new Date(),
      });
      //Insert web page record
      await this.insert(SerializeFor.INSERT_DB, conn);
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      await new Lmas().writeLog({
        context,
        project_uuid: this.project_uuid,
        logType: LogType.ERROR,
        message: 'Error creating new web page',
        location: 'HostingService/createWebsite',
        service: ServiceName.STORAGE,
        data: {
          error: err,
          website: this.serialize(),
        },
      });

      throw err;
    }

    return this;
  }

  /**
   * Function to get count of active web pages inside project
   * @returns
   */
  public async getNumOfWebsites(): Promise<number> {
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

  public async getList(context: ServiceContext, filter: WebsiteQueryFilter) {
    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'w.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'w',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields(
          'w',
          '',
          context.apiName == ApiName.ADMIN_CONSOLE_API
            ? SerializeFor.ADMIN_SELECT_DB
            : SerializeFor.SELECT_DB,
        )},
        uploadBucket.bucket_uuid, stgBucket.CIDv1 as cidStaging, prodBucket.CIDv1 as cidProduction, prodBucket.IPNS as ipnsProduction
        `,
      qFrom: `
        FROM \`${DbTables.WEBSITE}\` w
        JOIN \`${DbTables.BUCKET}\` uploadBucket ON uploadBucket.id = w.bucket_id
        JOIN \`${DbTables.BUCKET}\` stgBucket ON stgBucket.id = w.stagingBucket_id
        JOIN \`${DbTables.BUCKET}\` prodBucket ON prodBucket.id = w.productionBucket_id
        WHERE w.project_uuid = IFNULL(@project_uuid, w.project_uuid)
        AND (@search IS null OR w.name LIKE CONCAT('%', @search, '%') OR w.website_uuid LIKE @search)
        AND IFNULL(@status, ${SqlModelStatus.ACTIVE}) = w.status
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'w.id');
  }

  public async populateBucketsAndLink() {
    if (!this.project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    const ipfsCluster = await new ProjectConfig(
      { project_uuid: this.project_uuid },
      this.getContext(),
    ).getIpfsCluster();

    if (this.bucket_id) {
      this.bucket = await new Bucket({}, this.getContext()).populateById(
        this.bucket_id,
      );
      this.bucket_uuid = this.bucket.bucket_uuid;
    }
    if (this.stagingBucket_id) {
      this.stagingBucket = await new Bucket({}, this.getContext()).populateById(
        this.stagingBucket_id,
      );
      if (this.stagingBucket.CIDv1) {
        this.w3StagingLink = await ipfsCluster.generateLink(
          this.project_uuid,
          this.stagingBucket.CIDv1,
          false,
        );

        this.cidStaging = this.stagingBucket.CIDv1;
      }
    }
    if (this.productionBucket_id) {
      this.productionBucket = await new Bucket(
        {},
        this.getContext(),
      ).populateById(this.productionBucket_id);
      if (this.productionBucket.IPNS) {
        //Website has no IPNS record - link points to CID
        this.w3ProductionLink = await ipfsCluster.generateLink(
          this.project_uuid,
          this.productionBucket.IPNS,
          true,
        );
        this.cidProduction = this.productionBucket.CIDv1;
        this.ipnsProduction = this.productionBucket.IPNS;
      } else if (this.productionBucket.CIDv1) {
        //Website has no IPNS record - link points to CID
        this.w3ProductionLink = await ipfsCluster.generateLink(
          this.project_uuid,
          this.productionBucket.CIDv1,
          false,
        );
      }
    }
  }

  public async listDomains(query: DomainQueryFilter) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT domain, lastDeploymentDate FROM (
        SELECT w.domain,
        (
          SELECT d.updateTime
          FROM \`${DbTables.DEPLOYMENT}\` d
          WHERE d.website_id = w.id
          AND d.environment IN (${DeploymentEnvironment.PRODUCTION}, ${DeploymentEnvironment.DIRECT_TO_PRODUCTION})
          AND d.deploymentStatus = 10
          ORDER BY d.updateTime DESC
          LIMIT 1
        ) as lastDeploymentDate,
        (
          SELECT c.domain
          FROM \`${DbTables.IPFS_CLUSTER}\` c
          LEFT JOIN \`${DbTables.PROJECT_CONFIG}\` pc
            ON pc.ipfsCluster_id = c.id
            AND pc.project_uuid = w.project_uuid
          WHERE (pc.project_uuid = w.project_uuid OR c.isDefault = 1)
          AND c.status = ${SqlModelStatus.ACTIVE}
          ORDER BY c.isDefault ASC
          LIMIT 1
        ) as ipfsClusterDomain
        FROM \`${DbTables.WEBSITE}\` w
        JOIN \`${DbTables.BUCKET}\` b ON b.id = w.productionBucket_id
        WHERE w.domain IS NOT NULL
        AND w.domain <> ''
        AND b.CID IS NOT NULL
        AND w.status <> ${SqlModelStatus.DELETED}
        AND w.domainStatus <> ${WebsiteDomainStatus.INVALID}
      ) t
      WHERE (@ipfsClusterDomain IS NULL OR ipfsClusterDomain = @ipfsClusterDomain)
        `,
      { ipfsClusterDomain: query.ipfsClusterDomain },
    );
  }

  public async getDomains(): Promise<
    { domains: string; project_uuid: string }[]
  > {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT w.domain, w.project_uuid
      FROM \`${DbTables.WEBSITE}\` w
      JOIN \`${DbTables.BUCKET}\` b ON b.id = w.productionBucket_id
      WHERE w.domain IS NOT NULL
      AND w.domain <> ''
      AND b.CID IS NOT NULL
      AND w.status <> ${SqlModelStatus.DELETED}
      `,
      {},
    );
  }
}
