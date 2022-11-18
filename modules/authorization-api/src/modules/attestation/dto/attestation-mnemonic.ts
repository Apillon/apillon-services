import { ModelBase, PopulateFrom, presenceValidator } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { emailValidator } from '@rawmodel/validators';
import { ModuleValidatorErrorCode } from '../../../config/types';

export class AttestationMnemonicDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.ATTEST_MNEMONIC_NOT_PRESENT,
      },
    ],
  })
  public mnemonic: string;
}
