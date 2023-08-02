import { Injectable } from '@nestjs/common';
import { Lmas, LogsQueryFilter } from '@apillon/lib';

@Injectable()
export class LogsService {
  /**
   * Fetches list of logs stored in MongoDB
   * @param {LogsQueryFilter} filter - The query data for filtering the logs
   */
  async listMongoLogs(query: LogsQueryFilter) {
    return (await new Lmas().listMongoLogs(query)).data;
  }
}
