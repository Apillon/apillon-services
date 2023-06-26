import { BaseQueryFilter, PopulateFrom, prop } from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';

export class ProjectQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public search: string;
}
