import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  CodeException,
  Context,
  DefaultUserRole,
  FileUploadsQueryFilter,
  ForbiddenErrorCodes,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { CID } from 'ipfs-http-client';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '../../../context';
import { Bucket } from '../../bucket/models/bucket.model';
import { StorageCodeException } from '../../../lib/exceptions';

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
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
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
      SerializeFor.PROFILE,
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
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.FILE_UPLOAD_REQUEST_S3_FILE_CONTENT_TYPE_NOT_PRESENT,
      },
    ],
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
      SerializeFor.PROFILE,
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
  public CID: CID;

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
    const res = [];
    if (data && data.length) {
      for (const d of data)
        res.push(
          new FileUploadRequest({}, context).populate(d, PopulateFrom.DB),
        );
    }

    return res;
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

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async populateByUUID(file_uuid: string): Promise<this> {
    if (!file_uuid) {
      throw new Error('file_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE file_uuid = @file_uuid AND status <> ${SqlModelStatus.DELETED};
      `,
      { file_uuid },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
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
        INNER JOIN \`${DbTables.BUCKET}\` b ON fr.bucket_id = b.id
        LEFT JOIN \`${DbTables.FILE}\` f ON f.file_uuid = fr.file_uuid
        WHERE b.bucket_uuid = @bucket_uuid
        AND (@search IS null OR fr.fileName LIKE CONCAT('%', @search, '%'))
        AND (@fileStatus IS NULL OR fr.fileStatus = @fileStatus)
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
