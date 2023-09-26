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
export class IdentityLinkAccountDidDto extends ModelBase {
  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
  })
  public linkParameters: any;
}
