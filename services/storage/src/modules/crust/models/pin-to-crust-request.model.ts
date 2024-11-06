import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  env,
  prop,
} from '@apillon/lib';
import {
  booleanParser,
  integerParser,
  stringParser,
  dateParser,
} from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  CrustPinningStatus,
  DbTables,
  StorageErrorCode,
} from '../../../config/types';

export class PinToCrustRequest extends AdvancedSQLModel {
  public readonly tableName = DbTables.PIN_TO_CRUST_REQUEST;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.PIN_TO_CRUST_REQUEST_BUCKET_UUID_NOT_PRESENT,
      },
    ],
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
        code: StorageErrorCode.PIN_TO_CRUST_REQUEST_CID_NOT_PRESENT,
      },
    ],
  })
  public cid: string;

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
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.PIN_TO_CRUST_REQUEST_SIZE_NOT_PRESENT,
      },
    ],
  })
  public size: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    defaultValue: false,
    fakeValue: false,
  })
  public isDirectory: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SERVICE],
    validators: [],
  })
  public refId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SERVICE],
    validators: [],
  })
  public refTable: string;

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
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: StorageErrorCode.PIN_TO_CRUST_REQUEST_SIZE_NOT_PRESENT,
      },
    ],
    defaultValue: CrustPinningStatus.PENDING,
  })
  public pinningStatus: CrustPinningStatus;

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
      SerializeFor.SELECT_DB,
    ],
    defaultValue: 0,
  })
  public numOfExecutions: number;

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
  public message: string;

  @prop({
    parser: { resolver: dateParser() },
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
  public renewalDate: Date;

  public async populateByCid(cid: string): Promise<this> {
    if (!cid) {
      throw new Error('cid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE cid = @cid AND status <> ${SqlModelStatus.DELETED};
      `,
      { cid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  /**
   * Get requests that are waiting to be sent to crust (BCS)
   * @returns Array of PinToCrustRequest instances
   */
  public async getPendingRequest(): Promise<PinToCrustRequest[]> {
    const context = this.getContext();
    const data = await context.mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE pinningStatus IN (${CrustPinningStatus.PENDING} , ${CrustPinningStatus.FAILED})
      AND numOfExecutions < 5
      AND status <> ${SqlModelStatus.DELETED}
      LIMIT ${env.STORAGE_MAX_FILE_BATCH_SIZE_FOR_CRUST};
      `,
      {},
    );

    const pendingRequests: PinToCrustRequest[] = [];
    if (data?.length) {
      for (const pinToCrustRequest of data) {
        pendingRequests.push(new PinToCrustRequest(pinToCrustRequest, context));
      }
    }

    return pendingRequests;
  }

  public async renewOldRequests(): Promise<void> {
    const context = this.getContext();
    await context.mysql.paramExecute(
      `UPDATE \`${this.tableName}\`
      SET numOfExecutions = 0,
      pinningStatus = ${CrustPinningStatus.PENDING},
      renewalDate = NOW()
      WHERE pinningStatus = ${CrustPinningStatus.SUCCESSFULL}
      AND (
        (renewalDate IS NULL AND createTime < CURRENT_DATE() - INTERVAL 6 MONTH)
        OR
        (renewalDate IS NOT NULL AND renewalDate < CURRENT_DATE() - INTERVAL 6 MONTH)
      )
      AND status <> ${SqlModelStatus.DELETED};`,
    );
  }
}
