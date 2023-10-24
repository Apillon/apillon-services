import {
  Context,
  PopulateFrom,
  presenceValidator,
  prop,
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
import { Bucket } from './bucket.model';

export class BucketWebhook extends AdvancedSQLModel {
  public readonly tableName = DbTables.BUCKET_WEBHOOK;

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
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.BUCKET_WEBHOOK_BUCKET_ID_NOT_PRESENT,
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
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.BUCKET_WEBHOOK_URL_NOT_PRESENT,
      },
    ],
  })
  public url: string;

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
    ],
    validators: [],
  })
  public authMethod: string;

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
    ],
    validators: [],
  })
  public param1: string;

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
    ],
    validators: [],
  })
  public param2: string;

  public async canAccess(context: ServiceContext) {
    // Admins are allowed to access items on any project
    if (context.user?.userRoles.includes(DefaultUserRole.ADMIN)) {
      return true;
    }

    const b: Bucket = await new Bucket({}, context).populateById(
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
        b.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }

  public async canModify(context: ServiceContext) {
    const b: Bucket = await new Bucket({}, context).populateById(
      this.bucket_id,
    );
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.ADMIN,
        ],
        b.project_uuid,
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

  public async populateByBucketUuid(bucket_uuid: string): Promise<this> {
    if (!bucket_uuid) {
      throw new Error('bucket_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT bw.*
      FROM \`${DbTables.BUCKET_WEBHOOK}\` bw
      JOIN \`${DbTables.BUCKET}\` b on b.id = bw.bucket_id
      WHERE b.bucket_uuid = @bucket_uuid AND bw.status <> ${SqlModelStatus.DELETED};
      `,
      { bucket_uuid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
