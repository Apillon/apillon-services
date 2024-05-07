import {
  Context,
  FileUploadsQueryFilter,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  DefaultUserRole,
  CodeException,
  ForbiddenErrorCodes,
  AdvancedSQLModel,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { StorageCodeException } from '../../../lib/exceptions';
import { Bucket } from '../../bucket/models/bucket.model';

export class FileUploadRequest extends AdvancedSQLModel {
  public readonly tableName = DbTables.FILE_UPLOAD_REQUEST;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

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
    validators: [],
  })
  public session_id: number;

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
        code: StorageErrorCode.FILE_UPLOAD_REQUEST_BUCKET_ID_NOT_PRESENT,
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
    ],
    validators: [],
  })
  public directory_uuid: string;

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
  public file_uuid: string;

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
    setter(value: string) {
      if (value && value.length > 0) {
        value = value.replace(/^\/+/g, '');
        value += value.endsWith('/') ? '' : '/';
      }
      return value;
    },
    validators: [],
  })
  public path: string;

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
        code: StorageErrorCode.FILE_UPLOAD_REQUEST_S3_FILE_KEY_NOT_PRESENT,
      },
    ],
  })
  public s3FileKey: string;

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
        code: StorageErrorCode.FILE_UPLOAD_REQUEST_S3_FILE_NAME_NOT_PRESENT,
      },
    ],
  })
  public fileName: string;

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
  public contentType: string;

  /**
   * 1 = signed url for upload generated
   * 2 = uploaded to S3
   * 3 = transfered to IPFS
   * 4 = pinned to CRUST
   * 5 = upload completed
   * 100 = error transfering to IPFS
   * 101 = file does not exists on S3
   * */
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
      SerializeFor.SELECT_DB,
    ],
    validators: [],
    defaultValue: 1,
    fakeValue: 1,
  })
  public fileStatus: number;

  /*Additional properties - not stored in db ****************************************************************************** */

  @prop({
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
    validators: [],
  })
  public CID: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
    validators: [],
  })
  public size: number;

  @prop({
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
    validators: [],
  })
  public url: string;

  /**
   * ASYNC canAccess function
   * @param context
   */
  public async canAccess(context: ServiceContext) {
    // Admins are allowed to access items on any project
    if (context.user?.userRoles.includes(DefaultUserRole.ADMIN)) {
      return true;
    }

    const bucket: Bucket = await new Bucket({}, context).populateById(
      this.bucket_id,
    );
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        bucket.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }

  /**
   * ASYNC canModify function
   * @param context
   */
  public async canModify(context: ServiceContext) {
    const bucket: Bucket = await new Bucket({}, context).populateById(
      this.bucket_id,
    );
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.ADMIN,
        ],
        bucket.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissions to modify this record',
      });
    }
    return true;
  }

  public async populateFileUploadRequestsInSession(
    session_id: number,
    context: ServiceContext,
  ): Promise<this[]> {
    if (!session_id) {
      throw new Error('session_id should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE session_id = @session_id
      AND status <> ${SqlModelStatus.DELETED};
      `,
      { session_id },
    );

    return (
      data?.map((d) =>
        new FileUploadRequest({}, context).populate(d, PopulateFrom.DB),
      ) || []
    );
  }

  public async populateByS3FileKey(s3FileKey: string): Promise<this> {
    if (!s3FileKey) {
      throw new Error('s3FileKey should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE s3FileKey = @s3FileKey AND status <> ${SqlModelStatus.DELETED};
      `,
      { s3FileKey },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateByUUID(file_uuid: string): Promise<this> {
    return super.populateByUUID(file_uuid, 'file_uuid');
  }

  public async getList(
    context: ServiceContext,
    filter: FileUploadsQueryFilter,
  ) {
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      filter.bucket_uuid,
    );
    if (!bucket.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }
    bucket.canAccess(context);

    // Map url query with sql fields.
    const fieldMap = {
      id: 'fr.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'fr',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('fr', '')}, f.CID
        `,
      qFrom: `
        FROM \`${DbTables.FILE_UPLOAD_REQUEST}\` fr
        JOIN \`${DbTables.BUCKET}\` b ON fr.bucket_id = b.id
        JOIN \`${DbTables.FILE_UPLOAD_SESSION}\` s ON s.id = fr.session_id
        LEFT JOIN \`${DbTables.FILE}\` f ON f.file_uuid = fr.file_uuid
        WHERE b.bucket_uuid = @bucket_uuid
        AND (@search IS null OR fr.fileName LIKE CONCAT('%', @search, '%'))
        AND (@fileStatus IS NULL OR fr.fileStatus = @fileStatus)
        AND (@session_uuid IS NULL OR s.session_uuid = @session_uuid)
        AND fr.status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr ? filters.orderStr : 'fr.createTime DESC'}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'fr.id');
  }
}
