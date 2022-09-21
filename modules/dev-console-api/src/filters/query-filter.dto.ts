import { ApiProperty } from '@nestjs/swagger';
import { Model, prop } from '@rawmodel/core';
import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';
import { DbModelStatus, PopulateFor } from 'kalmia-sql-lib';
import { DefaultLimits, DefaultUserRole } from '../../config/types';

/**
 * General querying DTO.
 */
export class QueryFilterDto extends Model<any> {
  /**
   * Shall we include nested data
   */
  @ApiProperty({ required: false })
  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFor.ALL],
    defaultValue: false,
  })
  public nestedData: boolean;

  /**
   * Selected page querying property.
   */
  @ApiProperty({ required: false })
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFor.ALL],
    setter(v) {
      return v < 0 ? 1 : v;
    },
    defaultValue: 1,
  })
  public page: number;

  /**
   * Limit querying property.
   */
  @ApiProperty({ required: false })
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFor.ALL],
    setter(v) {
      if (v < 1) {
        v = DefaultLimits.PAGE_DEFAULT_LIMIT;
      }
      if (v > DefaultLimits.PAGE_MAX_LIMIT) {
        v = DefaultLimits.PAGE_MAX_LIMIT;
      }
      return v;
    },
    defaultValue: DefaultLimits.PAGE_DEFAULT_LIMIT,
  })
  public limit: number;

  /**
   * Order by property - can be any model's field.
   */
  @ApiProperty({ required: false })
  @prop({
    parser: { resolver: stringParser(), array: true },
    populatable: [PopulateFor.ALL],
    defaultValue: [],
  })
  public orderBy: string[];

  /**
   * Descending order property - value should be mapped to the index of the `orderBy` array.
   */
  @ApiProperty({ required: false, type: [Boolean] })
  @prop({
    parser: { resolver: stringParser(), array: true },
    populatable: [PopulateFor.ALL],
    defaultValue: [],
  })
  public desc: string[];

  /**
   * Model's ID property - only model with this ID will be returned.
   */
  @ApiProperty({ required: false })
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFor.ALL],
    defaultValue: null,
  })
  public id: number;

  /**
   * Model's status querying property.
   */
  @ApiProperty({ required: false, type: [Number] })
  @prop({
    parser: { resolver: integerParser(), array: true },
    populatable: [PopulateFor.ALL],
    defaultValue: null,
  })
  public status: number[];

  /**
   * Tells if current user is admin - can be used for special querying cases.
   */
  @prop({
    parser: { resolver: integerParser() },
    defaultValue: 0,
  })
  public isAdmin: number;

  /**
   * Populate function overwrite - Admin handling.
   *
   * @param data Model' data.
   * @param strategy Populate strategy.
   * @returns Populated model (this)
   */
  public populate(data: any = {}, strategy: PopulateFor) {
    super.populate(data, strategy);

    const context = this.getContext();
    this.isAdmin = context?.hasRole(DefaultUserRole.SUPER_ADMIN) ? 1 : 0;

    // Remove deleted status if user is not the admin user.
    if (this.status?.length && this.status.indexOf(DbModelStatus.DELETED) !== -1 && !this.isAdmin) {
      this.status = this.status.filter((s) => s !== DbModelStatus.DELETED);
    }

    return this;
  }

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
