import {
  Context,
  presenceValidator,
  prop,
  SerializeFor,
  UuidSqlModel,
} from '@apillon/lib';
import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';
import { ContractsErrorCode, DbTables } from '../../../config/types';

export class ContractVersionMethod extends UuidSqlModel {
  public readonly tableName = DbTables.CONTRACT_VERSION_METHOD;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public contract_version_id: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [],
  })
  public onlyOwner: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
  })
  public description: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }
}
