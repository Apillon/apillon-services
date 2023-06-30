// import { ApiProperty } from '@babel/core';
import { PopulateFrom } from '@apillon/lib';
import { ModelBase } from '@apillon/lib/dist/lib/base-models/base';
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
