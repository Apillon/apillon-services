import { DefaultUserRole, env, generateJwtToken } from '@apillon/lib';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permissions } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { BaseQueryFilterValidator } from '../../../decorators/base-query-filter-validator';

@Controller('admin-panel/dashboard')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class DashboardController {
  @Get('metabase-embed-url')
  @BaseQueryFilterValidator()
  async getMetabaseEmbedUrl() {
    const payload = {
      resource: { dashboard: 1 },
      params: {},
      exp: Math.round(Date.now() / 1000) + 10 * 60, // 10 minute expiration
    };
    // const token = jwt.sign(payload, env.METABASE_SECRET_KEY);
    const token = generateJwtToken('', payload, null, env.METABASE_SECRET);

    return (
      env.METABASE_URL +
      '/embed/dashboard/' +
      token +
      '#theme=night&bordered=true&titled=true'
    );
  }
}
