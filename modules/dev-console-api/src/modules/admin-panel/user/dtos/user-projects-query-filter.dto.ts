import { BaseQueryFilter, PopulateFrom, prop } from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';

export class UserProjectsQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public search: string;
}
