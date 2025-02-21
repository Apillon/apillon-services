import { LogsQueryFilter, RequestLogsQueryFilter } from '@apillon/lib';
import { Filter } from 'mongodb';

export const systemRoutes = [
  '/hosting/domains',
  '/discord-bot/user-list',
  '/storage/blacklist',
  '/system',
  '/auth/session-token',
  '/embedded-wallet/evm-token-prices',
  '/embedded-wallet/evm-token-prices',
  '/embedded-wallet/otp/generate',
  '/embedded-wallet/otp/validate',
];

export async function generateMongoLogsQuery(
  query: LogsQueryFilter | RequestLogsQueryFilter,
): Promise<Filter<any>> {
  const mongoQuery = {} as any;

  // Exact match fields
  ['project_uuid', 'user_uuid', 'apiKey'].forEach(
    (field) => query[field] && (mongoQuery[field] = query[field]),
  );

  // Multiselect fields
  ['logType', 'service'].forEach(
    (field) =>
      query[`${field}s`] && (mongoQuery[field] = { $in: query[`${field}s`] }),
  );

  // Request logs have search by url, others by message
  const property = query.collectionName.includes('request_logs')
    ? 'url'
    : 'message';

  // Search by substring/regex
  query[property] = query.search
    ? new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    : null;
  ['message', 'apiName', 'url', 'body'].forEach(
    (field) =>
      query[field] &&
      (mongoQuery[field] = {
        $regex: query[field],
        $options: 'i', // global regex
      }),
  );

  if (query instanceof RequestLogsQueryFilter) {
    if (!query.showSystemRequests) {
      // System routes, conditionally hide from results if showSystemRequests is false
      mongoQuery[property] = {
        ...(mongoQuery[property] || {}),
        $not: {
          $regex: systemRoutes.join('|'),
        },
      };
    }

    if (query.method) {
      mongoQuery.method = { $eq: query.method.toUpperCase() };
    }
  }

  if (query.dateFrom) {
    mongoQuery.ts = { $gte: new Date(query.dateFrom) };
  }

  if (query.dateTo) {
    mongoQuery.ts ||= {};
    mongoQuery.ts.$lte = new Date(query.dateTo);
  }

  return mongoQuery;
}
