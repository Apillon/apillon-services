import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  CodeException,
  Context,
  DefaultUserRole,
  DirectoryContentQueryFilter,
  ForbiddenErrorCodes,
  getQueryParams,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
  unionSelectAndCountQuery,
} from '@apillon/lib';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '../../../context';

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
  public parentDirectory_id: string;

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
        errorMessage: 'Insufficient permissins',
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
        errorMessage: 'Insufficient permissins',
      });
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
        SELECT 'directory' as type, d.id, d.name, d.CID, d.createTime, d.updateTime, NULL as contentType, NULL as size
        `,
        qFrom: `
        FROM \`${DbTables.DIRECTORY}\` d
        INNER JOIN \`${DbTables.BUCKET}\` b ON d.bucket_id = b.id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (IFNULL(@directory_id, -1) = IFNULL(d.parentDirectory_id, -1))
        AND (@search IS null OR d.name LIKE CONCAT('%', @search, '%'))
      `,
      },
      {
        qSelect: `
        SELECT 'file' as type, d.id, d.name, d.CID, d.createTime, d.updateTime, d.contentType as contentType, d.size as size
        `,
        qFrom: `
        FROM \`${DbTables.FILE}\` d
        INNER JOIN \`${DbTables.BUCKET}\` b ON d.bucket_id = b.id
        WHERE b.bucket_uuid = @bucket_uuid
        AND (IFNULL(@directory_id, -1) = IFNULL(d.directory_id, -1))
        AND (@search IS null OR d.name LIKE CONCAT('%', @search, '%'))
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

  /*public async getList(context: ServiceContext, query: BucketQueryFilter) {
    const params = {
      project_uuid: query.project_uuid,
      search: query.search,
    };

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('b', '')}
        `,
      qFrom: `
        FROM \`${DbTables.BUCKET}\` b
        WHERE (@search IS null OR b.name LIKE CONCAT('%', @search, '%'))
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'b.id');
  }*/
}
