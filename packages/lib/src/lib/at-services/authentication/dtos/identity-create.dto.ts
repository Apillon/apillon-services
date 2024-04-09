import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode, PopulateFrom } from '../../../../config/types';
import {
  didCreateCreateOpValidator,
  didUriValidator,
} from '../validators/did-create.validator';
import { JSONParser } from '../../../parsers';
import { BaseIdentityDto } from './base-identity.dto';

// const body = {
//   did_create_op: {
//    payload: {
//     message: u8aToHex(encryptedData.box),
//     nonce: u8aToHex(encryptedData.nonce),
//    },
//    senderPubKey: u8aToHex(keypair.publicKey),
//   },
//   claimerEmail: string,
//   didUri: string,
// };
export class IdentityCreateDto extends BaseIdentityDto {
  @prop({
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT,
      },
      {
        resolver: didCreateCreateOpValidator(),
        code: ValidatorErrorCode.IDENTITY_CREATE_INVALID_REQUEST,
      },
    ],
  })
  public did_create_op: any;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DID_URI_NOT_PRESENT,
      },
      {
        resolver: didUriValidator(),
        code: ValidatorErrorCode.DID_URI_INVALID,
      },
    ],
  })
  public didUri: string;

  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
  })
  public linkParameters: any;
}
