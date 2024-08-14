import { ServiceContext } from '@apillon/service-lib';
import { ExtractFromRow, ExtractFromRows } from './types';
import { MySql } from '@apillon/lib';

export class BaseRepository {
  protected context: ServiceContext;
  protected mysql: MySql;

  constructor(context: ServiceContext) {
    this.context = context;
    this.mysql = context.mysql;
  }

  /**
   * Extract models from a single row. Used for extracting joined rows for
   * many/one-to-one relationship.
   * @param row - row with data for model hydration
   * @param tableAliasesAndModels map of tableAlias -> model class name
   */
  protected extractModelDataFromRow: ExtractFromRow = (
    row,
    tableAliasesAndModels,
  ) => {
    const data = Object.keys(tableAliasesAndModels).reduce((acc: any, key) => {
      acc[key] = {};
      return acc;
    }, {});
    for (let tableAlias in tableAliasesAndModels) {
      const tablePrefix = `${tableAlias}__`;
      const values = {};
      for (const key in row) {
        if (key.startsWith(tablePrefix)) {
          values[key.replace(tablePrefix, '')] = row[key];
        }
      }
      const modelClass = tableAliasesAndModels[tableAlias];
      data[tableAlias] = new modelClass({}, this.context).populate(values);
    }

    return data;
  };

  /**
   * Extracts array of model from row. Used for extracting joined rows for
   * one/many-to-many relationship.
   * @param rows
   * @param tableAlias
   * @param modelClass
   */
  protected extractArrayOfModelFromRows: ExtractFromRows = (
    rows,
    tableAlias,
    modelClass,
  ) => {
    const tablePrefix = `${tableAlias}__`;

    let contractVersionMethods: any[] = [];
    for (let item of rows) {
      const contractVersionMethodData = {};
      for (const key in item) {
        if (key.startsWith(tablePrefix)) {
          contractVersionMethodData[key.replace(tablePrefix, '')] = item[key];
        }
      }

      contractVersionMethods.push(
        new modelClass({}, this.context).populate(contractVersionMethodData),
      );
    }

    return contractVersionMethods;
  };
}
