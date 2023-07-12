import { DbTables } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';

/**
 * TermsService class for handling Terms requests
 */
export class TermsService {
  /**
   * Get active Terms for the platform
   * @param {any} data - unused object from service request
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<Array<any>>} - The Terms data.
   */
  static async getActiveTerms(
    _data: any,
    context: ServiceContext,
  ): Promise<Array<any>> {
    const res = await context.mysql.paramExecute(
      `
      SELECT t.id, t.status, t.type, t.title, t.text, t.url, t.isRequired, t.validFrom
      FROM ${DbTables.TERMS} AS t
      INNER JOIN (
        SELECT type, MAX(validFrom) as max_validFrom
        FROM terms
        WHERE validFrom <= NOW()
        and status = 5
        GROUP BY type
      ) AS t2
      ON t.type = t2.type 
      AND t.validFrom = t2.max_validFrom;
    `,
    );

    if (!res.length) {
      return [];
    }

    return res;
  }
}
