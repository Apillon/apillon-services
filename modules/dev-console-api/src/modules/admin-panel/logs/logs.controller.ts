import {
  DefaultUserRole,
  LogsQueryFilter,
  ValidateFor,
  PopulateFrom,
  MongoCollections,
  RequestLogsQueryFilter,
} from '@apillon/lib';
import { Permissions, Validation } from '@apillon/modules-lib';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth.guard';
import { LogsService } from './logs.service';
import { ValidationGuard } from '../../../guards/validation.guard';

@Controller('admin-panel/logs')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @Validation({
    dto: LogsQueryFilter,
    validateFor: ValidateFor.QUERY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async listLogs(@Query() query: LogsQueryFilter) {
    query.collectionName = MongoCollections.LOGS;
    return this.logsService.listMongoLogs(query);
  }

  @Get('admin-alerts')
  @Validation({
    dto: LogsQueryFilter,
    validateFor: ValidateFor.QUERY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async listAdminAlerts(@Query() query: LogsQueryFilter) {
    query.collectionName = MongoCollections.ADMIN_ALERT;
    return this.logsService.listMongoLogs(query);
  }

  @Get('request-logs')
  @Validation({
    dto: RequestLogsQueryFilter,
    validateFor: ValidateFor.QUERY,
    populateFrom: PopulateFrom.ADMIN,
  })
  @UseGuards(ValidationGuard)
  async listRequestLogs(@Query() query: RequestLogsQueryFilter) {
    query.collectionName ||= MongoCollections.REQUEST_LOGS;
    return this.logsService.listMongoRequestLogs(query);
  }
}
