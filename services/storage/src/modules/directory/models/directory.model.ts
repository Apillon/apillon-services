import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  ProjectAccessModel,
  Context,
  DirectoryContentQueryFilter,
  env,
  getQueryParams,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
  unionSelectAndCountQuery,
} from '@apillon/lib';
import { DbTables, ObjectType, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import { File } from '../../storage/models/file.model';
import { ProjectConfig } from '../../config/models/project-config.model';
import { Bucket } from '../../bucket/models/bucket.model';
import { addJwtToIPFSUrl } from '../../../lib/ipfs-utils';

export class Directory extends ProjectAccessModel {
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
    validators: [],
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
      SerializeFor.PROFILE,
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
        code: StorageErrorCode.BUCKET_PROJECT_UUID_NOT_PRESENT,
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
        code: StorageErrorCode.DIRECTORY_BUCKET_ID_NOT_PRESENT,
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
        code: StorageErrorCode.DIRECTORY_NAME_NOT_PRESENT,
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

  /**
   * Time when directory status was set to 8 - MARKED_FOR_DELETION
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    populatable: [PopulateFrom.DB],
  })
  public markedForDeletionTime?: Date;

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

  /**
   * Marks record in the database for deletion.
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

  public override async populateByUUID(uuid: string): Promise<this> {
    return super.populateByUUID(uuid, 'directory_uuid');
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
    if (data && data.length) {
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
    const ipfsGateway = await new ProjectConfig(
      { project_uuid: bucket.project_uuid },
      this.getContext(),
    ).getIpfsGateway();

    const qSelects = [
      {
        qSelect: `
        SELECT ${ObjectType.DIRECTORY} as type, d.id, d.status, d.name, d.CID, d.createTime, d.updateTime,
        NULL as contentType, NULL as size, d.parentDirectory_id as parentDirectoryId,
        NULL as file_uuid, IF(d.CID IS NULL, NULL, CONCAT("${ipfsGateway.url}", d.CID)) as link, NULL as fileStatus
        `,
        qFrom: `
        FROM \`${DbTables.DIRECTORY}\` d
        INNER JOIN \`${DbTables.BUCKET}\` b ON d.bucket_id = b.id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (IFNULL(@directory_id, -1) = IFNULL(d.parentDirectory_id, -1))
        AND (@search IS null OR d.name LIKE CONCAT('%', @search, '%'))
        AND ( d.status = ${SqlModelStatus.ACTIVE} OR
          ( @markedForDeletion = 1 AND d.status = ${SqlModelStatus.MARKED_FOR_DELETION})
        )
      `,
      },
      {
        qSelect: `
        SELECT ${ObjectType.FILE} as type, d.id, d.status, d.name, d.CID, d.createTime, d.updateTime,
        d.contentType as contentType, d.size as size, d.directory_id as parentDirectoryId,
        d.file_uuid as file_uuid, CONCAT("${ipfsGateway.url}", d.CID) as link, d.fileStatus as fileStatus
        `,
        qFrom: `
        FROM \`${DbTables.FILE}\` d
        INNER JOIN \`${DbTables.BUCKET}\` b ON d.bucket_id = b.id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (IFNULL(@directory_id, -1) = IFNULL(d.directory_id, -1))
        AND (@search IS null OR d.name LIKE CONCAT('%', @search, '%'))
        AND ( d.status = ${SqlModelStatus.ACTIVE} OR
          ( @markedForDeletion = 1 AND d.status = ${SqlModelStatus.MARKED_FOR_DELETION})
        )
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
      'd.name',
    );

    if (ipfsGateway.private) {
      for (const item of data.items) {
        item.link = addJwtToIPFSUrl(item.link, bucket.project_uuid);
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
