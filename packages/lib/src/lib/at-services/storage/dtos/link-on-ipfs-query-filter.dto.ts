import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { BaseProjectQueryFilter } from '../../../base-models/base-project-query-filter.model';
import { presenceValidator } from '@rawmodel/validators';

export class LinkOnIpfsQueryFilter extends BaseProjectQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CID_NOT_PRESENT,
      },
    ],
  })
  public cid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    defaultValue: 'cid',
  })
  public type: string;
}
