import { ModelBase, PopulateFrom, presenceValidator } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { ModuleValidatorErrorCode } from '../../../config/types';
import {
  didCreatePayloadValidator,
  didCreateSenderValidator,
} from '../validators/did-create.validator';

// const body = {
//   payload: {
//     message: u8aToHex(encryptedData.box),
//     nonce: u8aToHex(encryptedData.nonce),
//   },
//   senderPubKey: u8aToHex(keypair.publicKey),
// };
export class DidCreateDto extends ModelBase {
  @prop({
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.DID_CREATE_PAYLOAD_NOT_PRESENT,
      },
      {
        resolver: didCreatePayloadValidator(),
        code: ModuleValidatorErrorCode.DID_CREATE_INVALID_REQUEST,
      },
    ],
  })
  public payload: object;

  @prop({
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.DID_CREATE_SENDER_KEY_NOT_PRESENT,
      },
      {
        resolver: didCreateSenderValidator(),
        code: ModuleValidatorErrorCode.DID_CREATE_INVALID_REQUEST,
      },
    ],
  })
  public senderPubKey: string;
}
