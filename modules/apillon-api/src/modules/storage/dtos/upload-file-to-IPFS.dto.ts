// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ModelBase } from '@apillon/lib/dist/lib/base-models/base';
import { ValidatorErrorCode } from '../../../config/types';

export class UploadFileToIPFSDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILE_PATH_NOT_PRESENT,
      },
    ],
  })
  public path: string;

  @prop({
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILE_CONTENT_NOT_PRESENT,
      },
    ],
  })
  public content:
    | string
    | InstanceType<typeof String>
    | ArrayBufferView
    | ArrayBuffer
    | Blob
    | ReadableStream<Uint8Array>;
}
