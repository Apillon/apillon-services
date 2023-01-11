import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  CodeException,
  Context,
  DefaultUserRole,
  DirectoryContentQueryFilter,
  env,
  ForbiddenErrorCodes,
  getQueryParams,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
  unionSelectAndCountQuery,
} from '@apillon/lib';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '../../../context';
import { v4 as uuidV4 } from 'uuid';

export class Directory extends AdvancedSQLModel {
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
    validators: [],
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

  public async populateByUUID(uuid: string): Promise<this> {
    if (!uuid) {
      throw new Error('uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE directory_uuid = @uuid AND status <> ${SqlModelStatus.DELETED};
      `,
      { uuid },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
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
      for (const d of data)
        res.push(new Directory({}, context).populate(d, PopulateFrom.DB));
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
  ) {
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'pd',
      {},
      filter.serialize(),
    );

    const qSelects = [
      {
        qSelect: `
        SELECT 'directory' as type, d.id, d.status, d.name, d.CID, d.createTime, d.updateTime, 
        NULL as contentType, NULL as size, d.parentDirectory_id as parentDirectoryId, 
        NULL as file_uuid, NULL as link
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
        SELECT 'file' as type, d.id, d.status, d.name, d.CID, d.createTime, d.updateTime, 
        d.contentType as contentType, d.size as size, d.directory_id as parentDirectoryId, 
        d.file_uuid as file_uuid, CONCAT("${env.STORAGE_IPFS_PROVIDER}", d.CID)
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
    return unionSelectAndCountQuery(
      context.mysql,
      {
        qSelects: qSelects,
        qFilter: `LIMIT ${filters.limit} OFFSET ${filters.offset};`,
      },
      params,
      'd.name',
    );
  }

  public async populateFullPath(): Promise<this> {
    this.fullPath = this.name;
    if (!this.parentDirectory_id) {
      return;
    } else {
      let tmpDir: Directory = undefined;
      do {
        tmpDir = await new Directory({}, this.getContext()).populateById(
          tmpDir ? tmpDir.parentDirectory_id : this.parentDirectory_id,
        );
        this.fullPath = tmpDir.name + '/' + this.fullPath;
      } while (tmpDir?.parentDirectory_id);
    }
  }
}
