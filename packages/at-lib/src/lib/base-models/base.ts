import { Model, prop } from '@rawmodel/core';
import { Context } from '../context';

/**
 * Common model related objects.
 */
export { prop };

/**
 * Base model.
 */
export abstract class ModelBase extends Model<any> {
  public async handle(error: any, { quiet }: { quiet: boolean } = { quiet: false }): Promise<this> {
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
}
