import { Injectable } from '@nestjs/common';
import { Lmas, LogsQueryFilter, RequestLogsQueryFilter } from '@apillon/lib';

@Injectable()
export class LogsService {
  /**
   * Fetches list of logs stored in MongoDB
   * @param {LogsQueryFilter} filter - The query data for filtering the logs
   */
  async listMongoLogs(query: LogsQueryFilter) {
    return (await new Lmas().listMongoLogs(query)).data;
  }

  /**
   * Fetches list of API/Console request logs stored in MongoDB
   * @param {RequestLogsQueryFilter} filter - The query data for filtering the logs
   */
  async listMongoRequestLogs(query: RequestLogsQueryFilter) {
    return (await new Lmas().listMongoRequestLogs(query)).data;
  }
}
