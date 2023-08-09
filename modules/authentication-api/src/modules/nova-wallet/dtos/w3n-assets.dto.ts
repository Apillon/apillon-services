// import { ApiProperty } from '@babel/core';
import { ModelBase, PopulateFrom } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { presenceValidator } from '@rawmodel/validators';
import { AuthenticationErrorCode } from '../../../config/types';

export class W3nAssetsDto extends ModelBase {
  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.DEFAULT_VALIDATION_ERROR,
      },
    ],
  })
  public assets: any;
}
