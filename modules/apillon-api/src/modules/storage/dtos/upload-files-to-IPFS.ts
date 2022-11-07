// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';
import { ModelBase } from '@apillon/lib/dist/lib/base-models/base';
import { ValidatorErrorCode } from '../../../config/types';
import { UploadFileToIPFSDto } from './upload-file-to-IPFS.dto';

export class UploadFilesToIPFSDto extends ModelBase {
  @prop({
    parser: {
      array: true,
      resolver: UploadFileToIPFSDto,
    },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.FILES_NOT_PRESENT,
      },
    ],
  })
  public files: UploadFileToIPFSDto[];
}
