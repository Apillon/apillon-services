import {
  Context,
  IpnsQueryFilter,
  Lmas,
  LogType,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
  UuidSqlModel,
  getQueryParams,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { v4 as uuidV4 } from 'uuid';
import { BucketType, DbTables, StorageErrorCode } from '../../../config/types';
import {
  StorageCodeException,
  StorageValidationException,
} from '../../../lib/exceptions';
import { Bucket } from '../../bucket/models/bucket.model';
import { ProjectConfig } from '../../config/models/project-config.model';
import { IpnsService } from '../ipns.service';

export class Ipns extends UuidSqlModel {
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
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.IPNS_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public ipns_uuid: string;

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
      SerializeFor.APILLON_API,
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
      SerializeFor.APILLON_API,
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
      SerializeFor.APILLON_API,
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
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public ipnsValue: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public key: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public cid: string;

  /*************************************INFO Properties */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public link: string;

  public override async populateByUUID(
    uuid: string,
    uuid_property = 'ipns_uuid',
    conn?: PoolConnection,
  ): Promise<this> {
    return super.populateByUUID(uuid, uuid_property, conn);
  }

  public async populateByBucketAndName(
    bucket_uuid: string,
    name: string,
  ): Promise<this> {
    if (!bucket_uuid || !name) {
      throw new Error('params should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT i.*
      FROM \`${DbTables.IPNS}\` i
      JOIN \`${DbTables.BUCKET}\` b ON b.id = i.bucket_id
      WHERE b.bucket_uuid = @bucket_uuid and i.name = @name AND i.status <> ${SqlModelStatus.DELETED};
      `,
      { bucket_uuid, name },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateByKey(key: string): Promise<this> {
    if (!key) {
      throw new Error('key should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.IPNS}\`
      WHERE \`key\` = @key AND status <> ${SqlModelStatus.DELETED};
      `,
      { key },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateByIpnsName(ipnsName: string): Promise<this> {
    if (!ipnsName) {
      throw new Error('ipnsName should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.IPNS}\`
      WHERE \`ipnsName\` = @ipnsName AND status <> ${SqlModelStatus.DELETED};
      `,
      { ipnsName },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public override async insert(
    strategy?: SerializeFor,
    conn?: PoolConnection,
    insertIgnore?: boolean,
  ): Promise<this> {
    this.ipns_uuid = this.ipns_uuid || uuidV4();
    await this.validateOrThrow(StorageValidationException);

    return super.insert(strategy, conn, insertIgnore);
  }

  public async createNewIpns(bucket: Bucket) {
    const context = this.getContext();
    const conn = await context.mysql.start();
    try {
      //Insert
      await this.insert(SerializeFor.INSERT_DB, conn);

      //If cid is specified, publish ipns to point to cid - other nodes will be able to resolve it
      if (this.cid) {
        //For hosting IPNSs, IPNS key is actually the bucket_uuid
        this.key =
          bucket.bucketType == BucketType.HOSTING
            ? bucket.bucket_uuid
            : this.key;

        const ipnsRes = await IpnsService.publishIpns(
          {
            ipns_uuid: this.ipns_uuid,
            cid: this.cid,
            ipns: this,
            conn: conn,
          },
          context,
        );

        //For hosting - if bucket has IPNS property then new deployments are published to IPNS
        if (bucket.bucketType == BucketType.HOSTING) {
          bucket.IPNS = ipnsRes.ipnsName;
          await bucket.update(SerializeFor.UPDATE_DB, conn);
        }
      }

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw new StorageCodeException({
        context,
        code: StorageErrorCode.ERROR_CREATING_IPNS_RECORD,
        details: err,
        status: 500,
      }).writeToMonitor({
        project_uuid: this.project_uuid,
      });
    }

    await new Lmas().writeLog({
      context,
      project_uuid: this.project_uuid,
      logType: LogType.INFO,
      message: 'New ipns record created',
      location: 'BucketService/createBucket',
      service: ServiceName.STORAGE,
      data: this.serialize(),
    });
  }

  public async getList(context: ServiceContext, filter: IpnsQueryFilter) {
    const b: Bucket = await new Bucket({}, context).populateByUUID(
      filter.bucket_uuid,
    );
    if (!b.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    this.project_uuid = b.project_uuid;

    this.canAccess(context);

    //Get IPFS-->IPNS gateway
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: this.project_uuid },
      this.getContext(),
    ).getIpfsCluster();

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
        i.updateTime
        `,
      qFrom: `
        FROM \`${DbTables.IPNS}\` i
        JOIN \`${DbTables.BUCKET}\` b on b.id = i.bucket_id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (@search IS null OR i.name LIKE CONCAT('%', @search, '%'))
        AND (@ipnsName IS null OR i.ipnsName LIKE CONCAT('%', @ipnsName, '%'))
        AND (@ipnsValue IS null OR i.ipnsValue LIKE CONCAT('%', @ipnsValue, '%'))
        AND i.status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    const data = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      { ...params, project_uuid: this.project_uuid },
      'i.id',
    );

    for (const item of data.items) {
      if (item.ipnsName) {
        item.link = await ipfsCluster.generateLink(
          b.project_uuid,
          item.ipnsName,
          true,
        );
      }
    }

    return data;
  }

  public async populateLink() {
    if (!this.ipnsName) {
      return;
    }

    const ipfsCluster = await new ProjectConfig(
      { project_uuid: this.project_uuid },
      this.getContext(),
    ).getIpfsCluster();

    this.link = await ipfsCluster.generateLink(
      this.project_uuid,
      this.ipnsName,
      true,
    );
  }
}
