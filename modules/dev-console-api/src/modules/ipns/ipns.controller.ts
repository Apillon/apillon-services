import { CreateIpnsDto, DefaultUserRole } from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { IpnsService } from './ipns.service';

@Controller('buckets/:bucket_id/ipns')
export class IpnsController {
  constructor(private ipnsService: IpnsService) {}

  @Post()
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateIpnsDto })
  @UseGuards(ValidationGuard)
  async createIpnsRecord(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_id', ParseIntPipe) bucket_id: number,
    @Body() body: CreateIpnsDto,
  ) {
    return await this.ipnsService.createIpnsRecord(context, bucket_id, body);
  }
}
