import { ModelBase, PopulateFrom, presenceValidator } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { emailValidator } from '@rawmodel/validators';
import { AuthenticationErrorCode } from '../../../config/types';
import {
  didCreateCreateOpValidator,
  didUriValidator,
} from '../validators/did-create.validator';

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
        code: AuthenticationErrorCode.IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT,
      },
      {
        resolver: didCreateCreateOpValidator(),
        code: AuthenticationErrorCode.IDENTITY_CREATE_INVALID_REQUEST,
      },
    ],
  })
  public did_create_op: object;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.USER_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: AuthenticationErrorCode.USER_EMAIL_NOT_VALID,
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
        code: AuthenticationErrorCode.DID_URI_NOT_PRESENT,
      },
      {
        resolver: didUriValidator(),
        code: AuthenticationErrorCode.DID_URI_INVALID,
      },
    ],
  })
  public didUri: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;
}