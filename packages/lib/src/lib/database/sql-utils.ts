import { PoolConnection } from 'mysql2/promise';
import * as SqlString from 'sqlstring';
import { env } from '../../config/env';

import { MySql } from './mysql';

export enum WhereQueryComparator {
  EQUAL,
  LESS_THAN,
  LESS_THAN_OR_EQUAL,
  MORE_THAN,
  MORE_THAN_OR_EQUAL,
  NOT_EQUAL,
  IN,
  NOT_IN,
  HAS_TEXT,
  IN_TEXT,
}

export interface SqlQueryObject {
  /**
   * 'Select' part of query
   */
  qSelect: string;
  /**
   * 'From' part of query
   */
  qFrom: string;
  /**
   * 'GROUP' part of query
   */
  qGroup?: string;
  /**
   * 'ORDER BY' and 'LIMIT - OFFSET' part of query
   */
  qFilter?: string;
}

/**
 * Function returns object for database query parameters
 *
 * @export
 * @param defaultParameters  Key-value object. All expected parameters should be listed, value can be null.
 * @param tableAlias table alias name
 * @param fieldMap URL query fields mapped with database query fields.
 * @param urlQuery URL query parameters.
 * @returns Object with parameters for database listing search.
 */
export function getQueryParams(
  defaultParameters: any,
  tableAlias: string,
  fieldMap: any,
  urlQuery: any,
) {
  const limit =
    urlQuery.limit === 'NO_LIMIT'
      ? null
      : parseInt(urlQuery.limit) || env.DEFAULT_PAGE_SIZE || 20;
  const offset =
    Number(urlQuery?.skip) || ((parseInt(urlQuery.page) || 1) - 1) * limit;
  const order = [];
  if (urlQuery.orderBy) {
    if (Array.isArray(urlQuery.orderBy)) {
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < urlQuery.orderBy.length; i++) {
        order.push({
          by: getOrderField(urlQuery.orderBy[i], tableAlias, fieldMap),
          desc: !!(Array.isArray(urlQuery.desc) && urlQuery.desc[i] == 'true'),
        });
      }
    } else {
      order.push({
        by: getOrderField(urlQuery.orderBy, tableAlias, fieldMap),
        // eslint-disable-next-line sonarjs/no-inverted-boolean-check
        desc: !!(urlQuery.desc == 'true'),
      });
    }
  }

  let orderStr = null;
  for (const o of order) {
    if (orderStr) {
      orderStr += ', ';
    } else {
      orderStr = '';
    }
    orderStr += `${o.by} ${o.desc ? 'DESC' : 'ASC'}`;
  }

  delete urlQuery.page;
  delete urlQuery.limit;
  delete urlQuery.orderBy;
  delete urlQuery.desc;

  return {
    params: {
      ...defaultParameters,
      ...urlQuery,
    },
    filters: {
      limit,
      offset,
      order,
      orderStr,
    },
  };
}

function getOrderField(name: string, tableAlias: string, map = {}) {
  if (!name) {
    name = 'id';
  }
  if (!map[name]) {
    // SqlString.escape prevents SQL injection!
    return SqlString.escapeId(`${tableAlias ? `${tableAlias}.` : ''}${name}`);
  }
  return map[name];
}

export function buildSearchParameter(searchString, fields: string[]) {
  if (!searchString) {
    return undefined;
  }
  const words = searchString.split(/\s+/g);

  let query = '';

  for (const word of words) {
    // ignore words that are shorter than 2 letter (that is — empty strings and one-letter words)
    if (word.trim().length < 2) {
      continue;
    }
    if (query.length) {
      query += ' AND ';
    }
    const wordEscaped = SqlString.escape(word.trim());
    let queryLinePrefix = '';
    for (const f in fields) {
      if (+f === 0) {
        // we are adding newline for better readability of debug logs
        queryLinePrefix = `(
        `;
      } else {
        queryLinePrefix = `
        OR `;
      }
      query += `${queryLinePrefix}${fields[f]} LIKE CONCAT('%', ${wordEscaped}, '%')`;
    }
    query += `
    )`;
  }
  return query;
}

export async function selectAndCountQuery(
  db: MySql,
  queryObj: SqlQueryObject,
  params: any,
  countByField: string,
  conn?: PoolConnection,
): Promise<{ items: Array<any>; total: number }> {
  const querySelect = [
    queryObj.qSelect,
    queryObj.qFrom,
    queryObj.qGroup,
    queryObj.qFilter,
  ].join('\n');

  const queryCount = `
  SELECT COUNT(*) as total
    FROM (
      SELECT ${countByField || 'id'}
      ${queryObj.qFrom}
      ${queryObj.qGroup ? `GROUP BY ${countByField || 'id'}` : ''}
    ) AS T;
  `;

  // // convert array parameters to sql arrays
  // for (const p in params) {
  //   if (Array.isArray(params[p])) {
  //     let sqlArray = '';
  //     for (let i = 0; i < params[p].length; i++) {
  //       sqlArray = `${i !== 0 ? `${sqlArray}, ` : ''}${SqlString.escape(params[p][i])}`;
  //     }
  //     params[p] = `( ${sqlArray} )`;
  //   }
  // }

  let items: Array<any>;
  let totalResults: Array<any>;
  const workers = [];
  try {
    workers.push(
      db.paramExecute(querySelect, params, conn).then((res) => (items = res)),
    );
    workers.push(
      db
        .paramExecute(queryCount, params, conn)
        .then((res) => (totalResults = res)),
    );
    await Promise.all(workers);
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
  const total = totalResults.length ? totalResults[0].total : 0;

  return { items, total };
}

export async function unionSelectAndCountQuery(
  db: MySql,
  queryObj: any,
  params: any,
  countByField: string,
): Promise<{ items: Array<any>; total: number }> {
  let querySelectAll = '';
  let queryCountAll = '';

  for (let i = 0; i < queryObj.qSelects.length; i++) {
    const querySelect = [
      queryObj.qSelects[i].qSelect,
      queryObj.qSelects[i].qFrom,
      queryObj.qSelects[i].qGroup,
      queryObj.qSelects[i].qFilter,
    ].join('\n');
    querySelectAll = `${
      i !== 0 ? `${querySelectAll}\n\nUNION\n\n` : ''
    }${querySelect}`;

    queryCountAll = `${i !== 0 ? `${queryCountAll}\n\nUNION\n\n` : ''} SELECT ${
      countByField || 'id'
    }
    ${queryObj.qSelects[i].qFrom}
    ${queryObj.qSelects[i].qGroup ? `GROUP BY ${countByField || 'id'}` : ''}`;
  }
  querySelectAll = `${querySelectAll}
    ${queryObj.qFilter}
  `;

  const queryCount = `
  SELECT COUNT(*) as total
    FROM (
      ${queryCountAll}
    ) AS T;
  `;

  // // convert array parameters to sql arrays
  // for (const p in params) {
  //   if (Array.isArray(params[p])) {
  //     let sqlArray = '';
  //     for (let i = 0; i < params[p].length; i++) {
  //       sqlArray = `${i === 0 ? `${sqlArray}, ` : ''}${SqlString.escape(params[p][i])}`;
  //     }
  //     params[p] = `(${sqlArray})`;
  //   }
  // }

  let items: Array<any>;
  let totalResults: Array<any>;
  const workers = [];
  try {
    workers.push(
      db.paramExecute(querySelectAll, params).then((res) => (items = res)),
    );
    workers.push(
      db.paramExecute(queryCount, params).then((res) => (totalResults = res)),
    );
    await Promise.all(workers);
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
  const total = totalResults.length ? totalResults[0].total : 0;

  return { items, total };
}

export function buildWhereCondition(
  comparator: WhereQueryComparator,
  field: string,
  param: string,
) {
  switch (comparator) {
    case WhereQueryComparator.EQUAL:
      return `${field} = @${param}`;
    case WhereQueryComparator.LESS_THAN:
      return `${field} < @${param}`;
    case WhereQueryComparator.LESS_THAN_OR_EQUAL:
      return `${field} <= @${param}`;
    case WhereQueryComparator.MORE_THAN:
      return `${field} > @${param}`;
    case WhereQueryComparator.MORE_THAN_OR_EQUAL:
      return `${field} >= @${param}`;
    case WhereQueryComparator.NOT_EQUAL:
      return `${field} <> @${param}`;
    case WhereQueryComparator.IN:
      return `${field} IN (@${param})`;
    case WhereQueryComparator.NOT_IN:
      return `${field} NOT IN (@${param})`;
    case WhereQueryComparator.HAS_TEXT:
      return `${field} LIKE '%' + @${param} + '%'`;
    case WhereQueryComparator.IN_TEXT:
      return `@${param} LIKE CONCAT('%', ${field}, '%')`;
    default:
      return '';
  }
}

/**
 * Returns nested objects from SQL query over multiple tables
 * @param items array of items from sql query response
 * @param groupIdKey root item ID field
 * @param subItemsOptions sub items definitions
 * @returns nested objects - items with subitems
 */
export function groupSubItem(
  items: Array<any>,
  groupIdKey: string,
  subItemsOptions: Array<{
    prefix: string;
    fieldName: string;
    key: string;
    isArray: boolean;
  }>,
) {
  const groupItems = new Map<number | string, any>();

  for (const opt of subItemsOptions) {
    const subitemsMap = {};
    for (const item of items) {
      let uniqItem = groupItems.get(item[groupIdKey]);
      const objMap =
        subitemsMap[item[groupIdKey]] || new Map<number | string, any>();

      if (!uniqItem) {
        groupItems.set(item[groupIdKey], item);
        uniqItem = item;
      }
      let nonNullFieldCount = 0;
      const detailObj = {};
      for (const key of Object.keys(item)) {
        if (key.startsWith(opt.prefix)) {
          detailObj[key.replace(opt.prefix, '')] = item[key];
          nonNullFieldCount += !!item[key] ? 1 : 0;
          delete item[key];
        }
      }
      if (nonNullFieldCount) {
        if (opt.isArray) {
          objMap.set(detailObj[opt.key], detailObj);
          subitemsMap[item[groupIdKey]] = objMap;
          uniqItem[opt.fieldName] = Array.from(objMap.values());
        } else {
          uniqItem[opt.fieldName] = detailObj;
        }
      }
    }
  }

  return Array.from(groupItems.values());
}

/**
 * Returns nested objects from SQL query over multiple tables
 * @param db db client instance
 * @param queryObj SQL query object
 * @param params SQL parameters
 * @param countByField count by ID field
 * @param groupIdKey root item ID field
 * @param subItemsOptions sub items definitions
 * @returns nested objects - items with subitems | total number of root items
 */
export async function selectAndGroupSubItems(
  db: MySql,
  queryObj: SqlQueryObject,
  params: any,
  countByField: string,
  groupIdKey: string,
  subItemsOptions: Array<{
    prefix: string;
    fieldName: string;
    key: string;
    isArray: boolean;
  }>,
) {
  const { items, total } = await selectAndCountQuery(
    db,
    queryObj,
    params,
    countByField,
  );
  return { items: groupSubItem(items, groupIdKey, subItemsOptions), total };
}
