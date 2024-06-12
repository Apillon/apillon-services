import {
  Context,
  enumInclusionValidator,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  UuidSqlModel,
} from '@apillon/lib';
import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import {
  ComputingErrorCode,
  ContractStatus,
  DbTables,
} from '../../../config/types';

const populatable = [
  PopulateFrom.DB,
  PopulateFrom.SERVICE,
  PopulateFrom.ADMIN,
  PopulateFrom.PROFILE,
];
const serializable = [
  SerializeFor.INSERT_DB,
  SerializeFor.ADMIN,
  SerializeFor.SERVICE,
  SerializeFor.APILLON_API,
  SerializeFor.PROFILE,
  SerializeFor.SELECT_DB,
];
const serializableUpdate = [...serializable, SerializeFor.UPDATE_DB];

export class AcurastJob extends UuidSqlModel {
  public readonly tableName = DbTables.ACURAST_JOB;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public job_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableUpdate,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: 'Acurast job#1',
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableUpdate,
  })
  public description: string;

  /**
   * IPFS CID of the script's code
   * @example QmUq4iFLKZUpEsHCAqfsBermXHRnPuE5CNcyPv1xaNkyGp
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public scriptCid: string;

  /**
   * The timestamp where the job will become available
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable,
    serializable,
  })
  public startTime: Date;

  /**
   * The timestamp where the job will expire
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable,
    serializable,
  })
  public endTime: Date;

  /**
   * The number of processors assigned to the job
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable,
    serializable,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    defaultValue: 1,
    fakeValue: 1,
  })
  public slots: number;

  /**
   * The on-chain job ID
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable,
    serializable,
  })
  public jobId: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable,
    serializable: serializableUpdate,
    validators: [
      {
        resolver: enumInclusionValidator(ContractStatus, true),
        code: ComputingErrorCode.DATA_TYPE_INVALID,
      },
    ],
    defaultValue: ContractStatus.CREATED,
  })
  public jobStatus: ContractStatus;

  /**
   * The job creation transaction hash
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
  })
  public transactionHash: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public override async populateByUUID(job_uuid: string): Promise<this> {
    return super.populateByUUID(job_uuid, 'job_uuid');
  }
}
