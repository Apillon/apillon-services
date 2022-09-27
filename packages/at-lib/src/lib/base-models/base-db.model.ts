import { prop } from '@rawmodel/core';
import { SerializeFor } from '../../config/types';
import { ModelBase } from './base';
import { Context } from '../context';

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
  public abstract collectionName: string;

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
