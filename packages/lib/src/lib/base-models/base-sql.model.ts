import { prop } from '@rawmodel/core';
import { PopulateFrom, SerializeFor } from '../../config/types';
import { PoolConnection } from 'mysql2/promise';
// import 'reflect-metadata';
import { BaseDBModel } from './base-db.model';
import { MySql } from '../database/mysql';

/**
 * Common model related objects.
 */
export { prop };

export abstract class BaseSQLModel extends BaseDBModel {
  public async insert(
    strategy: SerializeFor = SerializeFor.INSERT_DB,
    conn?: PoolConnection,
    ignore = false,
  ): Promise<this> {
    const serializedModel = this.serialize(strategy);
    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }
    try {
      const createQuery = `
      INSERT ${ignore ? 'IGNORE' : ''} INTO \`${this.tableName}\`
      ( ${Object.keys(serializedModel)
        .map((x) => `\`${x}\``)
        .join(', ')} )
      VALUES (
        ${Object.keys(serializedModel)
          .map((key) => `@${key}`)
          .join(', ')}
      )`;

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

  // public async replace(conn?: PoolConnection): Promise<this> {
  //   const serializedModel = this.serialize(SerializeFor.INSERT_DB);

  //   let isSingleTrans = false;
  //   if (!conn) {
  //     isSingleTrans = true;
  //     conn = await this.getContext().mysql.start();
  //   }

  //   try {
  //     const query = `
  //     REPLACE INTO \`${this.tableName}\`
  //     ( ${Object.keys(serializedModel)
  //         .map((x) => `\`${x}\``)
  //         .join(', ')} )
  //     VALUES (
  //       ${Object.keys(serializedModel)
  //         .map((key) => `@${key}`)
  //         .join(', ')}
  //     )`;

  //     await this.db().paramExecute(query, this.serialize(SerializeFor.INSERT_DB), conn);

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
   * Creates or updates model data in the database. Upsert can only be used if ID is present, otherwise INSERT will be called.
   * @param forceUpsert Force duplicate check even if no ID on the model.
   * @param insertStrategy insert serialization strategy
   * @param updateStrategy update serialization strategy
   * @param conn Pool connection if in transaction
   * @returns updated model
   */
  public async upsert(
    conn: PoolConnection,
    _forceUpsert = false,
    insertStrategy: SerializeFor = SerializeFor.INSERT_DB,
    updateStrategy: SerializeFor = SerializeFor.UPDATE_DB,
  ): Promise<any> {
    const insertModel = this.serialize(insertStrategy);
    const updateModel = this.serialize(updateStrategy);

    // ensure id if present
    if (this['id']) {
      insertModel.id = this['id'];
    }

    // remove non-updatable parameters
    delete insertModel.createTime;
    delete insertModel.updateTime;
    delete updateModel.createTime;
    delete updateModel.updateTime;

    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }

    let response = null;

    try {
      if (Object.keys(updateModel).length) {
        const createQuery = `
          INSERT INTO \`${this.tableName}\`
          ( ${Object.keys(insertModel)
            .map((x) => `\`${x}\``)
            .join(', ')} )
          VALUES (
            ${Object.keys(insertModel)
              .map((key) => `@${key}`)
              .join(', ')}
          )`;

        const updateQuery = `
          ON DUPLICATE KEY UPDATE
            ${Object.keys(updateModel)
              .map((x) => `\`${x}\` = @${x}`)
              .join(',\n')}
          `;

        response = await this.getContext().mysql.paramExecute(
          createQuery + updateQuery,
          { ...insertModel, ...updateModel },
          conn,
        );
      } else {
        const createQuery = `
          INSERT IGNORE INTO \`${this.tableName}\`
          ( ${Object.keys(insertModel)
            .map((x) => `\`${x}\``)
            .join(', ')} )
          VALUES (
            ${Object.keys(insertModel)
              .map((key) => `@${key}`)
              .join(', ')}
          )`;
        response = await this.getContext().mysql.paramExecute(
          createQuery,
          insertModel,
          conn,
        );
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

    return response;
  }

  public async deleteByFields(
    keys?: string[],
    conn?: PoolConnection,
  ): Promise<this> {
    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }
    try {
      let createQuery = `
      DELETE FROM \`${this.tableName}\`
      WHERE ${keys[0]} = @${keys[0]}
      `;

      for (let i = 1; i < keys.length; i++) {
        createQuery = `${createQuery}
          AND ${keys[i]} = @${keys[i]}`;
      }

      const queryParams = {};
      for (const key of keys) {
        queryParams[key] = this[key];
      }

      await this.getContext().mysql.paramExecute(
        createQuery,
        queryParams,
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

  public populateWithPrefix(
    data: any,
    prefix: string,
    strategy?: PopulateFrom,
  ) {
    const filteredData = {};
    prefix = prefix + '__';
    for (const key of Object.keys(data)) {
      if (data.hasOwnProperty(key) && key.startsWith(prefix)) {
        filteredData[key.replace(prefix, '')] = data[key];
      }
    }
    return this.populate(filteredData, strategy);
  }

  public populate(data: any, strategy?: PopulateFrom): this {
    const mappedObj = {};
    if (!data) {
      return super.populate(mappedObj, strategy);
    }
    for (const key of Object.keys(this.__props)) {
      if (data.hasOwnProperty(key)) {
        mappedObj[key] = data[key];
        // } else if (data.hasOwnProperty(getFieldName(this, key))) {
        //   mappedObj[key] = data[getFieldName(this, key)];
      }
    }
    return super.populate(mappedObj, strategy);
  }

  protected db(): MySql {
    return this.getContext().mysql as MySql;
  }

  public update(
    _strategy: SerializeFor = SerializeFor.UPDATE_DB,
    _conn?: PoolConnection,
  ): Promise<this> {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public delete(_conn?: PoolConnection): Promise<this> {
    throw new Error('Not implemented');
  }

  public generateSelectFields(
    prefix = '',
    asPrefix = '',
    serializeStrategy = SerializeFor.SELECT_DB,
  ) {
    const serialized = this.serialize(serializeStrategy);
    return (
      Object.keys(serialized)
        .map(
          (x) =>
            `${prefix ? `\`${prefix}\`.` : ''}\`${x}\` as '${
              asPrefix ? asPrefix + '__' : ''
            }${x}'`,
        )
        .join(',\n') || `${prefix ? `\`${prefix}\`.` : ''}*`
    );
  }

  public generateInsertFields(serializeStrategy = SerializeFor.INSERT_DB) {
    const serialized = this.serialize(serializeStrategy);
    return Object.keys(serialized)
      .map((x) => `\`${x}\``)
      .join(', ');
  }

  public generateSelectJSONFields(
    prefix = '',
    asPrefix = '',
    serializeStrategy = SerializeFor.SELECT_DB,
  ) {
    const serialized = this.serialize(serializeStrategy);
    return (
      Object.keys(serialized)
        .map(
          (x) =>
            `'${asPrefix ? asPrefix + '__' : ''}${x}', ${
              prefix ? `${prefix}.` : ''
            }${x}`,
        )
        .join(',\n') || `${prefix ? `\`${prefix}\`.` : ''}*`
    );
  }

  public generateGroupByFields(
    prefix = '',
    serializeStrategy = SerializeFor.SELECT_DB,
  ) {
    const serialized = this.serialize(serializeStrategy);
    return Object.keys(serialized)
      .map((x) => `${prefix ? `\`${prefix}\`.` : ''}\`${x}\``)
      .join(',\n');
  }
}

// const fieldNameMetadataKey = Symbol('fieldName');
// export function fieldName(name: string): any {
//   return Reflect.metadata(fieldNameMetadataKey, name);
// }

// export function getFieldName(target: any, propertyKey: string): any {
//   return Reflect.getMetadata(fieldNameMetadataKey, target, propertyKey);
// }
