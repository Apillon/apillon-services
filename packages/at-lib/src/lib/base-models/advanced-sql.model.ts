import { prop } from '@rawmodel/core';
import { integerParser, dateParser } from '@rawmodel/parsers';
import {
  ErrorCode,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
} from '../../config/types';
import { PoolConnection } from 'mysql2/promise';
import { BaseSQLModel } from './base-sql.model';
import { presenceValidator } from '@rawmodel/validators';
import { ValidationException } from '../exceptions';

/**
 * Common model related objects.
 */
export { prop };

export abstract class AdvancedSQLModel extends BaseSQLModel {
  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  /**
   * status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ErrorCode.STATUS_NOT_PRESENT,
      },
    ],
    defaultValue: SqlModelStatus.ACTIVE,
    fakeValue() {
      return SqlModelStatus.ACTIVE;
    },
  })
  public status?: number;

  /**
   * Created at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      // SerializeFor.PROFILE,
      // SerializeFor.ADMIN,
      // SerializeFor.SELECT_DB
    ],
    populatable: [PopulateFrom.DB],
  })
  public createTime?: Date;

  /**
   * Updated at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      // SerializeFor.PROFILE,
      // SerializeFor.ADMIN,
      // SerializeFor.SELECT_DB
    ],
    populatable: [PopulateFrom.DB],
  })
  public updateTime?: Date;

  /**
   * User who created the object
   */
  @prop({
    serializable: [
      // SerializeFor.PROFILE,
      // SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      // SerializeFor.SELECT_DB
    ],
    populatable: [PopulateFrom.DB],
  })
  public createUser?: number;

  /**
   * User who created the object
   */
  @prop({
    serializable: [
      // SerializeFor.PROFILE,
      // SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      // SerializeFor.SELECT_DB
    ],
    populatable: [PopulateFrom.DB],
  })
  public updateUser?: number;

  /**
   * Tells if the model represents a document stored in the database.
   */
  public exists(): boolean {
    return !!this.id;
  }

  public isEnabled() {
    return this.status !== SqlModelStatus.DELETED;
  }

  public async create(conn?: PoolConnection) {
    try {
      await this.validate();
    } catch (err) {
      await this.handle(err);
      throw new ValidationException(this);
    }

    return await this.insert(SerializeFor.INSERT_DB, conn);
  }

  /**
   * Populates model fields by loading the document with the provided id from the database.
   * @param id Document's ID.
   */
  public async populateById(
    id: number | string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!id) {
      throw new Error('ID should not be null');
    }

    if (!this.hasOwnProperty('id')) {
      throw new Error('Object does not contain id property');
    }

    this.reset();

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.collectionName}\`
      WHERE id = @id AND status <> ${SqlModelStatus.DELETED};
      `,
      { id },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async populateByName(
    name: string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!this.hasOwnProperty('name')) {
      throw new Error('Object does not contain name property');
    }

    const data = await this.db().paramExecute(
      `SELECT * FROM ${this.collectionName} WHERE name = @name`,
      { name },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  /**
   * Saves model data in the database as a new document.
   */
  public async insert(
    strategy: SerializeFor = SerializeFor.INSERT_DB,
    conn?: PoolConnection,
  ): Promise<this> {
    this.createUser = this.getContext()?.user?.id;
    this.updateUser = this.getContext()?.user?.id;

    const serializedModel = this.serialize(strategy);
    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }
    try {
      const createQuery = `
      INSERT INTO \`${this.collectionName}\`
      ( ${Object.keys(serializedModel)
        .map((x) => `\`${x}\``)
        .join(', ')} )
      VALUES (
        ${Object.keys(serializedModel)
          .map((key) => `@${key}`)
          .join(', ')}
      )`;

      const response = await this.getContext().mysql.paramExecute(
        createQuery,
        serializedModel,
        conn,
      );
      if (!this.id) {
        this.id = (response as any).insertId;
        if (!this.id) {
          const req = await this.getContext().mysql.paramExecute(
            'SELECT last_insert_id() AS id;',
            null,
            conn,
          );
          this.id = req[0].id;
        }
      }

      if (isSingleTrans) {
        await this.getContext().mysql.commit(conn);
      }
    } catch (err) {
      if (isSingleTrans) {
        await this.getContext().mysql.rollback(conn);
      }
      throw new Error(err);
    }

    return this;
  }

  // public async replace(conn?: PoolConnection): Promise<this> {
  //   const id = this.id;
  //   this.updateUser = this.getContext()?.user?.id;

  //   const serializedModel = this.serialize(SerializeFor.INSERT_DB);
  //   serializedModel.id = id;

  //   let isSingleTrans = false;
  //   if (!conn) {
  //     isSingleTrans = true;
  //     conn = await this.getContext().mysql.start();
  //   }

  //   try {
  //     const query = `
  //     REPLACE INTO \`${this.collectionName}\`
  //     ( ${Object.keys(serializedModel)
  //         .map((x) => `\`${x}\``)
  //         .join(', ')} )
  //     VALUES (
  //       ${Object.keys(serializedModel)
  //         .map((key) => `@${key}`)
  //         .join(', ')}
  //     )`;

  //     await this.db().paramExecute(query, serializedModel, conn);

  //     if (isSingleTrans) {
  //       await this.getContext().mysql.commit(conn);
  //     }
  //   } catch (err) {
  //     if (isSingleTrans) {
  //       await this.getContext().mysql.rollback(conn);
  //     }
  //     throw new Error(err);
  //   }

  //   return this;
  // }

  /**
   * Updates model data in the database.
   */
  public async update(
    strategy: SerializeFor = SerializeFor.UPDATE_DB,
    conn?: PoolConnection,
  ): Promise<this> {
    this.updateUser = this.getContext()?.user?.id;

    const serializedModel = this.serialize(strategy);

    // remove non-updatable parameters
    delete serializedModel.id;
    delete serializedModel.createTime;
    delete serializedModel.updateTime;

    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }

    try {
      const createQuery = `
      UPDATE \`${this.collectionName}\`
      SET
        ${Object.keys(serializedModel)
          .map((x) => `\`${x}\` = @${x}`)
          .join(',\n')}
      WHERE id = @id
      `;

      // re-set id parameter for where clause.
      serializedModel.id = this.id;

      await this.getContext().mysql.paramExecute(
        createQuery,
        serializedModel,
        conn,
      );

      if (isSingleTrans) {
        await this.getContext().mysql.commit(conn);
      }
    } catch (err) {
      if (isSingleTrans) {
        await this.getContext().mysql.rollback(conn);
      }
      throw new Error(err);
    }

    return this;
  }

  /**
   * Creates or updates model data in the database. Upsert can only be used if ID is present, otherwise INSERT will be called.
   * @param conn Pool connection if in transaction
   * @param forceUpsert Force duplicate check even if no ID on the model.
   * @param insertStrategy insert serialization strategy
   * @param updateStrategy update serialization strategy
   * @returns updated model
   */
  public async upsert(
    conn: PoolConnection,
    forceUpsert = false,
    insertStrategy: SerializeFor = SerializeFor.INSERT_DB,
    updateStrategy: SerializeFor = SerializeFor.UPDATE_DB,
  ): Promise<any> {
    this.updateUser = this.getContext()?.user?.id;

    // if no id is known, call insert
    if (this.id === null || this.id === undefined) {
      this.createUser = this.getContext()?.user?.id;
      if (!forceUpsert) {
        try {
          return await this.insert(insertStrategy, conn);
        } catch (err) {
          console.error('Insert failed! Trying upsert instead.', err);
        }
      }
    }

    const response = await super.upsert(
      conn,
      forceUpsert,
      insertStrategy,
      updateStrategy,
    );
    if (!this.id) {
      this.id = (response as any).insertId || null;
    }
    return this;
  }

  /**
   * Marks document in the database as deleted.
   */
  public async markDeleted(conn?: PoolConnection): Promise<this> {
    this.updateUser = this.getContext()?.user?.id;

    this.status = SqlModelStatus.DELETED;

    try {
      await this.update(SerializeFor.INSERT_DB, conn);
    } catch (err) {
      this.reset();
      throw err;
    }
    return this;
  }

  /*
   * Deletes document from the database
   */
  public async delete(conn?: PoolConnection): Promise<this> {
    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }
    try {
      const createQuery = `
      DELETE FROM \`${this.collectionName}\`
      WHERE id = @id
      `;

      await this.getContext().mysql.paramExecute(
        createQuery,
        { id: this.id },
        conn,
      );

      if (isSingleTrans) {
        await this.getContext().mysql.commit(conn);
      }
    } catch (err) {
      if (isSingleTrans) {
        await this.getContext().mysql.rollback(conn);
      }
      throw new Error(err);
    }

    return this;
  }
}
