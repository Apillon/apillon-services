import { ModelBase, PopulateFrom, presenceValidator } from '@apillon/lib';
import { SubmittableExtrinsic } from '@kiltprotocol/types';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { ModuleValidatorErrorCode } from '../../../config/types';

export class AttestDidCreateExtrinsicDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.ATTEST_DID_CREATE_EXT_NOT_PRESENT,
      },
      // {
      //   resolver: extrinsicValidator(),
      //   code: ModuleValidatorErrorCode.ATTEST_TX_INVALID_EXTRINSIC,
      // },
    ],
  })
  public did_create_call: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.ATTEST_DID_CREATE_EXT_NOT_PRESENT,
      },
      // {
      //   resolver: extrinsicValidator(),
      //   code: ModuleValidatorErrorCode.ATTEST_TX_INVALID_EXTRINSIC,
      // },
    ],
  })
  public decryptionKey: string;
}
