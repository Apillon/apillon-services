import {
  DefaultUserRole,
  LogsQueryFilter,
  ValidateFor,
  PopulateFrom,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../guards/auth.guard';
import { LogsService } from './logs.service';
import { DevConsoleApiContext } from '../../../context';
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
  async listUsers(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: LogsQueryFilter,
  ) {
    return await this.logsService.listMongoLogs(context, query);
  }
}
