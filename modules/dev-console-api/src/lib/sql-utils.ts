import { PoolConnection } from 'mysql2/promise';
import * as SqlString from 'sqlstring';
import { env } from '../config/env';
import { MySql } from './mysql';

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
export function getQueryParams(defaultParameters: any, tableAlias: string, fieldMap: any, urlQuery: any) {
  const limit = urlQuery.limit === 'NO_LIMIT' ? null : parseInt(urlQuery.limit) || env.DEFAULT_PAGE_SIZE || 100;
  const offset = Number(urlQuery?.skip) || ((parseInt(urlQuery.page) || 1) - 1) * limit;
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

export async function selectAndCountQuery(
  db: MySql,
  queryObj: SqlQueryObject,
  params: any,
  countByField: string,
  conn?: PoolConnection,
): Promise<{ items: Array<any>; total: number }> {
  const querySelect = [queryObj.qSelect, queryObj.qFrom, queryObj.qGroup, queryObj.qFilter].join('\n');

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
    workers.push(db.paramExecute(querySelect, params, conn).then((res) => (items = res)));
    workers.push(db.paramExecute(queryCount, params, conn).then((res) => (totalResults = res)));
    await Promise.all(workers);
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
  const total = totalResults.length ? totalResults[0].total : 0;

  return { items, total };
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
