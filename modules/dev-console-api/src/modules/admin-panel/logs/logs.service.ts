import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { Lmas, LogsQueryFilter } from '@apillon/lib';

@Injectable()
export class LogsService {
  /**
   * Fetches list of logs stored in MongoDB
   * @param {DevConsoleApiContext} context - The API context with current user session.
   */
  async listMongoLogs(context: DevConsoleApiContext, query: LogsQueryFilter) {
    return await new Lmas().listMongoLogs(query);
  }
}
