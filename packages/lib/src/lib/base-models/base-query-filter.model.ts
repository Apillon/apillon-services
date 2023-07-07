// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom } from '../../config/types';
import { ModelBase } from './base';

export class BaseQueryFilter extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    setter(v) {
      return v < 0 ? 1 : v;
    },
    defaultValue: 1,
  })
  public page: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    setter(v) {
      return v < 1 ? 20 : v;
    },
    defaultValue: 20,
  })
  public limit: number;

  /**
   * Order by property - can be any model's field.
   */
  @prop({
    parser: { resolver: stringParser(), array: true },
    populatable: [PopulateFrom.PROFILE],
    defaultValue: [],
  })
  public orderBy: string[];

  /**
   * Descending order property - value should be mapped to the index of the `orderBy` array.
   */
  @prop({
    parser: { resolver: stringParser(), array: true },
    populatable: [PopulateFrom.PROFILE],
    defaultValue: [],
  })
  public desc: string[];

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public search?: string;

  /**
   * Returns default values of the query object.
   */
  public getDefaultValues(): any {
    const defaultValues = {} as any;

    Object.keys(this.__props).forEach((key) => {
      const modelProp = this.getProp(key);
      defaultValues[key] = modelProp.getInitialValue();
    });

    delete defaultValues.page;
    delete defaultValues.limit;
    delete defaultValues.orderBy;
    delete defaultValues.desc;

    return defaultValues;
  }
}
