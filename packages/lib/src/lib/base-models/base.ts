import { Model, prop } from '@rawmodel/core';
import { Context } from '../context';
import { ModelValidationException } from '../exceptions/exceptions';
import { PopulateFrom } from '../../config/types';

/**
 * Common model related objects.
 */
export { prop };

/**
 * Base model.
 */
export abstract class ModelBase extends Model<Context> {
  /**
   * Class constructor.
   * @param data Input data.
   * @param context
   */
  public constructor(data?: unknown, context?: Context) {
    super(data, { context });
  }

  /**
   * Populate the model with the given data and strategy
   * @param {(Partial<this> | Record<string, any>)} data - Object used to fill model with props
   * @param {?PopulateFrom} [strategy] - Population strategy
   * @returns {this}
   */
  public override populate(
    // This type works the same as `any`, but provides autocomplete for the model's props
    data: Partial<this> | Record<string, any>,
    strategy?: PopulateFrom,
  ): this {
    const mappedObj = {};
    if (!data) {
      return super.populate(mappedObj, strategy);
    }
    for (const key of Object.keys(this.__props)) {
      if (key in data) {
        mappedObj[key] = data[key];
        // } else if (data.hasOwnProperty(getFieldName(this, key))) {
        //   mappedObj[key] = data[getFieldName(this, key)];
      }
    }
    return super.populate(mappedObj, strategy);
  }

  /**
   * Populate a model based on an object with prefixed fileds
   * @param {(Partial<this> | Record<string, any>)} data - Object used to fill model with props
   * @param {string} prefix
   * @param {?PopulateFrom} [strategy]
   * @returns {this}
   */
  public populateWithPrefix(
    data: Partial<this> | Record<string, any>,
    prefix: string,
    strategy?: PopulateFrom,
  ): this {
    const filteredData = {};
    prefix = `${prefix}__`;
    for (const key of Object.keys(data)) {
      if (key in data && key.startsWith(prefix)) {
        filteredData[key.replace(prefix, '')] = data[key];
      }
    }
    return this.populate(filteredData, strategy);
  }

  /**
   * Serialize the model according to the current context
   * @param context Context
   */
  public serializeByContext(context: Context = this.getContext()): {
    [key: string]: any;
  } {
    return this.serialize(context.getSerializationStrategy());
  }

  /**
   * Populate a model based on multiple strategies
   * @param {(Partial<this> | Record<string, any>)} data - Object used to fill model with props
   * @param {PopulateFrom[]} strategies
   */
  public populateByStrategies(
    data: Partial<this> | Record<string, any>,
    strategies: PopulateFrom[],
  ) {
    for (const strategy of strategies) {
      this.populate(data, strategy);
    }
  }

  /**
   * Handle validation errors for a model
   * @param {*} error
   * @param {{ quiet: boolean; }} [param0={ quiet: false }]
   * @returns {Promise<this>}
   */
  public override async handle(
    error: any,
    { quiet } = { quiet: false },
  ): Promise<this> {
    try {
      await super.handle(error, { quiet });
      if (!quiet) {
        console.error(error);
        console.error(this.collectErrors());
      }
    } catch (e) {
    } finally {
      return this;
    }
  }

  /**
   * Validate a model and throw an error if it is invalid
   * @param {new (
   *       model: Model,
   *       errorCodes?: any,
   *     ) => ModelValidationException} validationException
   * @param {?object} [errorCodes]
   * @returns {Promise<this>}
   */
  public async validateOrThrow(
    validationException: new (
      model: Model,
      errorCodes?: any,
    ) => ModelValidationException,
    errorCodes?: object,
  ): Promise<this> {
    try {
      return await this.validate();
    } catch (err) {
      await this.handle(err);
      if (!this.isValid()) {
        throw new validationException(this, errorCodes);
      }
    }
  }
}

export type ModelBaseKeys = keyof ModelBase;

export type ModelBaseType<T> = Omit<T, ModelBaseKeys>;
