import {
  Context,
  DirectoryContentQueryFilter,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
  getQueryParams,
  prop,
  unionSelectAndCountQuery,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { v4 as uuidV4 } from 'uuid';
import { DbTables, ObjectType, StorageErrorCode } from '../../../config/types';
import { Bucket } from '../../bucket/models/bucket.model';
import { ProjectConfig } from '../../config/models/project-config.model';
import { File } from '../../storage/models/file.model';

export class Directory extends UuidSqlModel {
  public readonly tableName = DbTables.DIRECTORY;

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
        code: StorageErrorCode.DIRECTORY_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public directory_uuid: string;

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
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
    ],
    validators: [],
  })
  public parentDirectory_id: number;

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
        code: StorageErrorCode.DIRECTORY_REQUIRED_DATA_NOT_PRESENT,
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
        code: StorageErrorCode.DIRECTORY_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public bucket_id: number;

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
        code: StorageErrorCode.DIRECTORY_REQUIRED_DATA_NOT_PRESENT,
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

  /*************************************************************
   * INFO Properties
   *************************************************************/

  @prop({
    parser: { resolver: stringParser() },
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
  public fullPath: string;

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
  public files: File;

  /************************************INFO properties */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.SERVICE, SerializeFor.PROFILE],
    validators: [],
  })
  public parentDirectory_uuid: string;

  public override async populateByUUID(uuid: string): Promise<this> {
    if (!uuid) {
      throw new Error(`uuid should not be null: directory_uuid: ${uuid}`);
    }

    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT d.*, pd.directory_uuid as parentDirectory_uuid
        FROM \`${DbTables.DIRECTORY}\` d
        LEFT JOIN \`${DbTables.DIRECTORY}\` pd ON d.parentDirectory_id = pd.id
        WHERE d.directory_uuid = @uuid
        AND d.status <> ${SqlModelStatus.DELETED};
      `,
      { uuid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateByCid(cid: string): Promise<this> {
    if (!cid) {
      throw new Error('cid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE CID = @cid AND status <> ${SqlModelStatus.DELETED};
      `,
      { cid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  /**
   * Return array of Directories, that are in bucket
   * @param bucket_id
   * @param context
   * @returns
   */
  public async populateDirectoriesInBucket(
    bucket_id: number,
    context: ServiceContext,
  ): Promise<this[]> {
    if (!bucket_id) {
      throw new Error('bucket_id should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE bucket_id = @bucket_id AND status <> ${SqlModelStatus.DELETED};
      `,
      { bucket_id },
    );
    const res = [];
    if (data?.length) {
      for (const d of data) {
        res.push(new Directory({}, context).populate(d, PopulateFrom.DB));
      }
    }

    return res;
  }

  /**
   * Return array of objects (directories) and files, that are in bucket and in specific parent directory
   * @param bucket_id
   * @param parentDirectory_id
   * @returns
   */
  public async getDirectoryContent(
    context: ServiceContext,
    filter: DirectoryContentQueryFilter,
    bucket: Bucket,
  ) {
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      '',
      {},
      filter.serialize(),
    );

    //Get IPFS gateway
    const ipfsCluster = await new ProjectConfig(
      { project_uuid: bucket.project_uuid },
      this.getContext(),
    ).getIpfsCluster();

    const qSelects = [
      {
        qSelect: `
        SELECT d.directory_uuid as uuid, ${ObjectType.DIRECTORY} as type, d.name, d.CID, d.createTime, d.updateTime,
        NULL as contentType, NULL as size, pd.directory_uuid as directoryUuid,
        NULL as fileStatus
        `,
        qFrom: `
        FROM \`${DbTables.DIRECTORY}\` d
        INNER JOIN \`${DbTables.BUCKET}\` b ON d.bucket_id = b.id
        LEFT JOIN \`${DbTables.DIRECTORY}\` pd ON pd.id = d.parentDirectory_id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (IFNULL(@directory_uuid, '-1') = IFNULL(pd.directory_uuid, '-1'))
        AND (@search IS null OR d.name LIKE CONCAT('%', @search, '%'))
        AND d.status = ${SqlModelStatus.ACTIVE}
      `,
      },
      {
        qSelect: `
        SELECT d.file_uuid as uuid, ${ObjectType.FILE} as type, d.name, d.CID, d.createTime, d.updateTime,
        d.contentType as contentType, d.size as size, pd.directory_uuid as directoryUuid,
        d.fileStatus as fileStatus
        `,
        qFrom: `
        FROM \`${DbTables.FILE}\` d
        INNER JOIN \`${DbTables.BUCKET}\` b ON d.bucket_id = b.id
        LEFT JOIN \`${DbTables.DIRECTORY}\` pd ON pd.id = d.directory_id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (IFNULL(@directory_uuid, '-1') = IFNULL(pd.directory_uuid, '-1'))
        AND (@search IS null OR d.name LIKE CONCAT('%', @search, '%'))
        AND d.status = ${SqlModelStatus.ACTIVE}
      `,
      },
    ];
    const data = await unionSelectAndCountQuery(
      context.mysql,
      {
        qSelects: qSelects,
        qFilter: `ORDER BY ${filters.orderStr} LIMIT ${filters.limit} OFFSET ${filters.offset};`,
      },
      params,
      'd.id',
    );

    //Populate link
    for (const item of data.items) {
      if (item.CID) {
        item.link = ipfsCluster.generateLink(bucket.project_uuid, item.CID);
      }
    }

    return data;
  }

  public async populateFullPath(directories?: Directory[]): Promise<this> {
    this.fullPath = this.name;
    if (!this.parentDirectory_id) {
      return;
    } else {
      let tmpDir: Directory = undefined;
      do {
        if (directories) {
          tmpDir = directories.find(
            (x) =>
              x.id ==
              (tmpDir ? tmpDir.parentDirectory_id : this.parentDirectory_id),
          );
        } else {
          tmpDir = await new Directory({}, this.getContext()).populateById(
            tmpDir ? tmpDir.parentDirectory_id : this.parentDirectory_id,
          );
        }

        this.fullPath = tmpDir.name + '/' + this.fullPath;
      } while (tmpDir?.parentDirectory_id);
    }
  }
}
