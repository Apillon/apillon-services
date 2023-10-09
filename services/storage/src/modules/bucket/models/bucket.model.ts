import {
  BucketQueryFilter,
  Context,
  PoolConnection,
  PopulateFrom,
  ProjectAccessModel,
  SerializeFor,
  SqlModelStatus,
  enumInclusionValidator,
  getQueryParams,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { v4 as uuidV4 } from 'uuid';
import { BucketType, DbTables, StorageErrorCode } from '../../../config/types';

export class Bucket extends ProjectAccessModel {
  public readonly tableName = DbTables.BUCKET;

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
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
    fakeValue: () => uuidV4(),
  })
  public bucket_uuid: string;

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
        code: StorageErrorCode.BUCKET_PROJECT_UUID_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
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
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.BUCKET_TYPE_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(BucketType, false),
        code: StorageErrorCode.BUCKET_TYPE_NOT_VALID,
      },
    ],
    fakeValue: BucketType.STORAGE,
  })
  public bucketType: number;

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
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.BUCKET_NAME_NOT_PRESENT,
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
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public description: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
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
    defaultValue: 0,
  })
  public size: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
    defaultValue: 0,
  })
  public uploadedSize: number;

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
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
  })
  public CID: string;

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
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
  })
  public CIDv1: string;

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
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public IPNS: string;

  /**
   * Time when bucket was set to status 8 - MARKED_FOR_DELETION
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    populatable: [PopulateFrom.DB],
  })
  public markedForDeletionTime?: Date;

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
        FROM \`${DbTables.BUCKET}\`
        WHERE (id LIKE @id OR bucket_uuid LIKE @id)
          AND status <> ${SqlModelStatus.DELETED};
      `,
      { id },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public override async populateByUUID(uuid: string): Promise<this> {
    return super.populateByUUID(uuid, 'bucket_uuid');
  }

  /**
   * Marks bucket in the database for deletion.
   */
  public async markForDeletion(conn?: PoolConnection): Promise<this> {
    this.updateUser = this.getContext()?.user?.id;

    this.status = SqlModelStatus.MARKED_FOR_DELETION;
    this.markedForDeletionTime = new Date();

    try {
      await this.update(SerializeFor.UPDATE_DB, conn);
    } catch (err) {
      this.reset();
      throw err;
    }
    return this;
  }

  public async getList(
    context: ServiceContext,
    filter: BucketQueryFilter,
    serializationStrategy = SerializeFor.PROFILE,
  ) {
    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'b.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'b',
      fieldMap,
      filter.serialize(),
    );

    const selectFields = this.generateSelectFields(
      'b',
      '',
      serializationStrategy,
    );
    const sqlQuery = {
      qSelect: `
        SELECT ${selectFields}
        `,
      qFrom: `
        FROM \`${DbTables.BUCKET}\` b
        WHERE b.project_uuid = @project_uuid
        AND ((@bucketType IS null AND b.bucketType IN (1,3)) OR b.bucketType = @bucketType)
        AND (@search IS null OR b.name LIKE CONCAT('%', @search, '%'))
        AND IFNULL(@status, ${SqlModelStatus.ACTIVE}) = status
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    const list = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      params,
      'b.id',
    );
    const items = await Promise.all(
      list.items.map(async (bucket) => {
        return new Bucket({}, context)
          .populate(bucket, PopulateFrom.DB)
          .serialize(serializationStrategy);
      }),
    );

    return {
      ...list,
      items,
    };
  }

  public async clearBucketContent(context: Context, conn: PoolConnection) {
    await context.mysql.paramExecute(
      `
        UPDATE \`${DbTables.DIRECTORY}\`
        SET status = ${SqlModelStatus.DELETED}
        WHERE bucket_id = @bucket_id
          AND status <> ${SqlModelStatus.DELETED};
      `,
      { bucket_id: this.id },
      conn,
    );

    await context.mysql.paramExecute(
      `
        UPDATE \`${DbTables.FILE}\`
        SET status = ${SqlModelStatus.DELETED}
        WHERE bucket_id = @bucket_id
          AND status <> ${SqlModelStatus.DELETED};
      `,
      { bucket_id: this.id },
      conn,
    );

    this.size = 0;
    await this.update(SerializeFor.UPDATE_DB, conn);
  }

  /**
   * Function to get count of active bucket inside project
   * @param {boolean} ofType - Query only buckets of this bucket's type
   */
  public async getNumOfBuckets(ofType = true) {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT COUNT(*) as numOfBuckets
        FROM \`${DbTables.BUCKET}\`
        WHERE project_uuid = @project_uuid ${
          ofType ? `AND bucketType = @bucketType` : ''
        }
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid: this.project_uuid, bucketType: this.bucketType },
    );

    return data[0].numOfBuckets;
  }

  /**
   * Function to get total size of all buckets inside a project
   */
  public async getTotalSizeUsedByProject(): Promise<number> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT SUM(size) as totalSize
        FROM \`${DbTables.BUCKET}\`
        WHERE project_uuid = @project_uuid
          AND status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid: this.project_uuid, bucketType: this.bucketType },
    );

    return data[0].totalSize;
  }

  /**
   * Method which returns true, if there are files inside this bucket
   * @returns true / false
   */
  public async containsFiles() {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT f.id
        FROM \`${DbTables.FILE}\` f
        WHERE f.bucket_id = @bucket_id
          AND status <> ${SqlModelStatus.DELETED} LIMIT 1;
      `,
      { bucket_id: this.id },
    );

    return data.length > 0;
  }

  /**
   * Get number of buckets and total bucket size used for a project
   */
  public async getDetailsForProject() {
    const numOfBuckets = await this.getNumOfBuckets(false);
    const totalBucketSize = await this.getTotalSizeUsedByProject();
    return { numOfBuckets, totalBucketSize };
  }
}
