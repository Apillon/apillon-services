import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  SubstrateChain,
  ValidatorErrorCode,
} from '../../../../config/types';
import { prop } from '../../../base-models/base';
import { enumInclusionValidator } from '../../../validators';
import { BaseTransactionDto } from './base-transaction.dto';

export class CreateSubstrateTransactionDto extends BaseTransactionDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SUBSTRATE_TRANSACTION_NOT_PRESENT,
      },
    ],
  })
  public transaction: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SUBSTRATE_CHAIN_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(SubstrateChain),
        code: ValidatorErrorCode.SUBSTRATE_CHAIN_NOT_VALID,
      },
    ],
  })
  public chain: SubstrateChain;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public fromAddress?: string;
}
