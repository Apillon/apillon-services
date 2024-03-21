import { Model, prop } from '@rawmodel/core';
import { Context } from '../context';
import { ValidationException } from '../exceptions/exceptions';
import { ValidatorErrorCode } from '../../config/types';

/**
 * Common model related objects.
 */
export { prop };

/**
 * Base model.
 */
export abstract class ModelBase extends Model<any> {
  /**
   * Class constructor.
   * @param data Input data.
   * @param config Model configuration.
   */
  public constructor(data?: unknown, context?: Context) {
    super(data, { context });
  }

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

  public async validateOrThrow(
    validationException: new (
      model: Model,
      errorCodes?: any,
    ) => ValidationException,
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

  public populateByStrategies(data, strategies: string[]) {
    for (const strategy of strategies) {
      this.populate(data, strategy);
    }
  }
}
