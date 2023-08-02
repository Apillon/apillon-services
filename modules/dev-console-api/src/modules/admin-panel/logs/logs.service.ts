import { Injectable } from '@nestjs/common';
import { Lmas, LogsQueryFilter } from '@apillon/lib';

@Injectable()
export class LogsService {
  /**
   * Fetches list of logs stored in MongoDB
   * @param {DevConsoleApiContext} context - The API context with current user session.
   */
  async listMongoLogs(query: LogsQueryFilter) {
    return (await new Lmas().listMongoLogs(query)).data;
  }
}
