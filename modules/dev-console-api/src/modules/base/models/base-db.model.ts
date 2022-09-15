import { prop } from '@rawmodel/core';
import { Context } from '../../../context';
import { SerializeFor } from '../../../config/types';
import { ModelBase } from './base';
import { DbTables } from '../../../config/types';

/**
 * Common model related objects.
 */
export { prop };

/**
 * Base database model.
 */
export abstract class BaseDBModel extends ModelBase {
  /**
   * Document's collection name.
   */
  public abstract collectionName: DbTables;

  /**
   * Class constructor.
   * @param data Input data.
   * @param config Model configuration.
   */
  public constructor(data?: unknown, context?: Context) {
    super(data, context);
  }

  /**
   * Tells if the model represents an object stored in database
   */
  public abstract exists(): boolean;

  /**
   * Saves model data in the database as a new document.
   */
  public abstract insert(strategy: SerializeFor): Promise<any>;

  /**
   * Updates model data in the database.
   */
  public abstract update(strategy: SerializeFor): Promise<any>;

  /**
   * Marks document in the database as deleted.
   */
  public abstract delete(): Promise<any>;
}
