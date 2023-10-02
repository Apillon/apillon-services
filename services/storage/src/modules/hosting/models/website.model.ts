import {
  Context,
  Lmas,
  LogType,
  PoolConnection,
  PopulateFrom,
  ProjectAccessModel,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
  WebsiteQueryFilter,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { BucketType, DbTables, StorageErrorCode } from '../../../config/types';
import { StorageValidationException } from '../../../lib/exceptions';
import { addJwtToIPFSUrl } from '../../../lib/ipfs-utils';
import { Bucket } from '../../bucket/models/bucket.model';
import { ProjectConfig } from '../../config/models/project-config.model';

export class Website extends ProjectAccessModel {
  public readonly tableName = DbTables.WEBSITE;

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
      SerializeFor.SELECT_DB,
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
        code: StorageErrorCode.WEBSITE_NAME_NOT_PRESENT,
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

  @prop({
    parser: { resolver: dateParser() },
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
  public domainChangeDate: Date;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    validators: [],
  })
  public cdnId: string;

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
  public bucket_uuid: string;

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
  public w3StagingLink: string;

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
  public w3ProductionLink: string;

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
  public ipnsStaging: string;

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
  public ipnsProduction: string;

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

  public override async populateById(
    id: number | string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!id) {
      throw new Error('ID should not be null');
    }

    if (!this.hasOwnProperty('id')) {
      throw new Error('Object does not contain id property');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE ( id LIKE @id OR website_uuid LIKE @id)
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { id },
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
    try {
      await bucket.validate();
    } catch (err) {
      await bucket.handle(err);
      if (!bucket.isValid()) {
        throw new StorageValidationException(bucket);
      }
    }
    const stagingBucket: Bucket = new Bucket(
      {
        bucket_uuid: uuidV4(),
        project_uuid: this.project_uuid,
        bucketType: BucketType.HOSTING,
        name: this.name + '_staging',
      },
      context,
    );
    try {
      await stagingBucket.validate();
    } catch (err) {
      await stagingBucket.handle(err);
      if (!stagingBucket.isValid()) {
        throw new StorageValidationException(stagingBucket);
      }
    }
    const productionBucket: Bucket = new Bucket(
      {
        bucket_uuid: uuidV4(),
        project_uuid: this.project_uuid,
        bucketType: BucketType.HOSTING,
        name: this.name + '_production',
      },
      context,
    );
    try {
      await productionBucket.validate();
    } catch (err) {
      await productionBucket.handle(err);
      if (!productionBucket.isValid()) {
        throw new StorageValidationException(productionBucket);
      }
    }

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
        website_uuid: website_uuid,
        bucket_id: bucket.id,
        stagingBucket_id: stagingBucket.id,
        productionBucket_id: productionBucket.id,
        bucket: bucket,
        stagingBucket: stagingBucket,
        productionBucket: productionBucket,
        domainChangeDate: this.domain ? new Date() : undefined,
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
        FROM \`${DbTables.WEBSITE}\` wp
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
    if (!this.project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    const ipfsGateway = await new ProjectConfig(
      { project_uuid: this.project_uuid },
      this.getContext(),
    ).getIpfsGateway();

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
      if (this.stagingBucket.IPNS) {
        this.ipnsStagingLink = ipfsGateway.ipnsUrl + this.stagingBucket.IPNS;

        if (ipfsGateway.subdomainGateway) {
          this.w3StagingLink = `https://${this.stagingBucket.IPNS}.ipns.${ipfsGateway.subdomainGateway}`;
        }

        if (ipfsGateway.private) {
          this.ipnsStagingLink = addJwtToIPFSUrl(
            this.ipnsStagingLink,
            this.project_uuid,
          );

          this.w3StagingLink = addJwtToIPFSUrl(
            this.w3StagingLink,
            this.project_uuid,
          );
        }

        this.ipnsStaging = this.stagingBucket.IPNS;
      }
    }
    if (this.productionBucket_id) {
      this.productionBucket = await new Bucket(
        {},
        this.getContext(),
      ).populateById(this.productionBucket_id);
      if (this.productionBucket.IPNS) {
        this.ipnsProductionLink =
          ipfsGateway.ipnsUrl + this.productionBucket.IPNS;

        if (ipfsGateway.subdomainGateway) {
          this.w3ProductionLink = `https://${this.productionBucket.IPNS}.ipns.${ipfsGateway.subdomainGateway}`;
        }

        if (ipfsGateway.private) {
          this.ipnsProductionLink = addJwtToIPFSUrl(
            this.ipnsProductionLink,
            this.project_uuid,
          );
          this.w3ProductionLink = addJwtToIPFSUrl(
            this.w3ProductionLink,
            this.project_uuid,
          );
        }

        this.ipnsProduction = this.productionBucket.IPNS;
      }
    }
  }

  public async listDomains(context: ServiceContext) {
    return await context.mysql.paramExecute(
      `
        SELECT wp.domain
        FROM \`${this.tableName}\` wp
        JOIN \`${DbTables.BUCKET}\` b ON b.id = wp.productionBucket_id
        WHERE wp.domain IS NOT NULL
        AND wp.domain <> ''
        AND b.CID IS NOT NULL
        AND wp.status <> ${SqlModelStatus.DELETED};
        `,
      {},
    );
  }
}
