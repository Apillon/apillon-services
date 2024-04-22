import {
  AdvancedSQLModel,
  Context,
  FileUploadSessionQueryFilter,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, FileStatus, StorageErrorCode } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Bucket } from '../../bucket/models/bucket.model';
import { StorageCodeException } from '../../../lib/exceptions';

export class FileUploadSession extends AdvancedSQLModel {
  public readonly tableName = DbTables.FILE_UPLOAD_SESSION;

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
    validators: [],
  })
  public session_uuid: string;

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
        code: StorageErrorCode.FILE_UPLOAD_SESSION_BUCKET_ID_NOT_PRESENT,
      },
    ],
  })
  public bucket_id: number;

  /**
   * 1=session opened for upload, 2=session closed & transfered to IPFS
   */
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
  public sessionStatus: number;

  public override async populateByUUID(uuid: string): Promise<this> {
    return super.populateByUUID(uuid, 'session_uuid');
  }

  public async getNumOfFilesInSession(): Promise<number> {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT COUNT(id) as numOfFiles
      FROM \`${DbTables.FILE_UPLOAD_REQUEST}\`
      WHERE session_id = @session_id;
      `,
      { session_id: this.id },
    );

    return data[0].numOfFiles;
  }

  public async getList(
    context: ServiceContext,
    filter: FileUploadSessionQueryFilter,
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
      id: 's.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      's',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT s.session_uuid, s.sessionStatus, s.createTime, s.updateTime COUNT(fur.id) as numOfFileUploadRequests, COUNT(f.id) as numOfUploadedFiles
        `,
      qFrom: `
        FROM \`${DbTables.FILE_UPLOAD_SESSION}\` s
        INNER JOIN \`${DbTables.BUCKET}\` b ON s.bucket_id = b.id
        LEFT JOIN \`${DbTables.FILE_UPLOAD_REQUEST}\` fur ON fur.session_id = s.id
        LEFT JOIN \`${DbTables.FILE}\` f 
          ON f.file_uuid = fur.file_uuid 
          AND f.fileStatus IN (${FileStatus.UPLOADED_TO_IPFS}, ${FileStatus.PINNING_TO_CRUST}, ${FileStatus.PINNED_TO_CRUST})
        WHERE b.bucket_uuid = @bucket_uuid
        AND (@search IS null OR s.session_uuid LIKE CONCAT('%', @search, '%'))
        AND s.status <> ${SqlModelStatus.DELETED}
        GROUP BY s.session_uuid, s.sessionStatus, s.createTime, s.updateTime
      `,
      qFilter: `
        ORDER BY ${filters.orderStr ? filters.orderStr : 's.createTime DESC'}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
