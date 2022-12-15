import { ModelBase, PopulateFrom, presenceValidator } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { emailValidator } from '@rawmodel/validators';
import { AuthorizationErrorCode } from '../../../config/types';
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
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthorizationErrorCode.IDENTITY_CREATE_DID_CREATE_OP_NOT_PRESENT,
      },
      {
        resolver: didCreateCreateOpValidator(),
        code: AuthorizationErrorCode.IDENTITY_CREATE_INVALID_REQUEST,
      },
    ],
  })
  public did_create_op: object;

  @prop({
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthorizationErrorCode.USER_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: AuthorizationErrorCode.USER_EMAIL_NOT_VALID,
      },
    ],
  })
  public email: string;

  @prop({
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthorizationErrorCode.DID_URI_NOT_PRESENT,
      },
      {
        resolver: didUriValidator(),
        code: AuthorizationErrorCode.DID_URI_INVALID,
      },
    ],
  })
  public didUri: string;

  @prop({
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthorizationErrorCode.ATTEST_VERIFICATION_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;
}
