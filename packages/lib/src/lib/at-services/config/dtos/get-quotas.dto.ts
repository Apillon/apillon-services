import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, QuotaCode, QuotaType } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class GetQuotasDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public quota_id?: QuotaCode;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public project_uuid?: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public object_uuid?: string;

  @prop({
    parser: { resolver: integerParser(), array: true },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    defaultValue: null,
  })
  public types?: QuotaType[];
}
