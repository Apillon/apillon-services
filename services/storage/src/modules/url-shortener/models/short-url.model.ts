import {
  BaseSQLModel,
  Context,
  ErrorCode,
  PopulateFrom,
  SerializeFor,
  ShortUrlDto,
  SqlModelStatus,
  ValidatorErrorCode,
  env,
  presenceValidator,
  prop,
  urlDomainValidator,
} from '@apillon/lib';
import { DbTables, StorageErrorCode } from '../../../config/types';
import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import { StorageValidationException } from '../../../lib/exceptions';

export class ShortUrl extends BaseSQLModel {
  public readonly tableName = DbTables.SHORT_URL;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * generated ID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
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
        code: StorageErrorCode.MISSING_SHORT_URL_ID,
      },
    ],
  })
  public id: string;

  /**
   * target Url
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
      PopulateFrom.SERVICE,
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
        code: StorageErrorCode.MISSING_TARGET_URL,
      },
      {
        resolver: urlDomainValidator(env.SHORTENER_VALID_DOMAINS),
        code: ValidatorErrorCode.TARGET_URL_NOT_VALID,
      },
    ],
  })
  public targetUrl: string;

  /**
   * status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ErrorCode.STATUS_NOT_PRESENT,
      },
    ],
    defaultValue: SqlModelStatus.ACTIVE,
    fakeValue() {
      return SqlModelStatus.ACTIVE;
    },
  })
  public status?: number;

  /**
   * Created at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.APILLON_API,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [
      PopulateFrom.DB, //
    ],
  })
  public createTime?: Date;

  /**
   * User who created the object
   */
  @prop({
    serializable: [
      SerializeFor.INSERT_DB, //
    ],
    populatable: [
      PopulateFrom.DB, //
    ],
  })
  public createUser?: number;

  /**
   * Updated at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.APILLON_API, //
      SerializeFor.ADMIN,
    ],
    populatable: [
      PopulateFrom.DB, //
    ],
  })
  public updateTime?: Date;

  public exists(): boolean {
    return !!this.id;
  }

  public async populateById(id: string) {
    const resp = await this.db().paramExecute(
      `
      SELECT * FROM ${DbTables.SHORT_URL}
      WHERE id = @id
    `,
      { id },
    );

    if (!resp.length) {
      return this.reset();
    }
    return this.populate(resp[0], PopulateFrom.DB);
  }

  public async populateByTarget(targetUrl: string) {
    const resp = await this.db().paramExecute(
      `
      SELECT * FROM ${DbTables.SHORT_URL}
      WHERE targetUrl = @targetUrl
      `,
      { targetUrl },
    );

    if (!resp.length) {
      return this.reset();
    }
    return this.populate(resp[0], PopulateFrom.DB);
  }

  public async generateShortUrl(data: ShortUrlDto) {
    this.reset();
    this.populate(data, PopulateFrom.SERVICE);
    this.targetUrl = this.targetUrl?.toLowerCase().trim();
    this.id = this.generateShortUrlKey();
    await this.validateOrThrow(StorageValidationException);
    await this.insert();
    return this;
  }

  private generateShortUrlKey(length = 5) {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }
}
