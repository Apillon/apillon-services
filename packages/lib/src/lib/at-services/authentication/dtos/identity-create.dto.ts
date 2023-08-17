import { prop } from '@rawmodel/core';
import { booleanParser, stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode, PopulateFrom } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import {
  didCreateCreateOpValidator,
  didUriValidator,
} from '../validators/did-create.validator';
import { JSONParser } from '../../../parsers';

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
export class IdentityCreateDto extends ModelBase {
  @prop({
    // TODO: parser -> This is an object, so do we really need to parse anything?
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
        code: ValidatorErrorCode.USER_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: ValidatorErrorCode.USER_EMAIL_NOT_VALID,
      },
    ],
  })
  public email: string;

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

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;
}
