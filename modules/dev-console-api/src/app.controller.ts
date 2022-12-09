import { Lmas, Scs, ServiceName } from '@apillon/lib';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello() {
    const q = await new Scs().getQuota({ quota_id: 1 });
    console.log(q);
    return this.appService.getHello();
  }

  @Get('say-hi-to-apillon-admins')
  async sayHiToApillonAdmins() {
    await new Lmas().sendAdminAlert(
      ':wave: Hello from the other side!',
      ServiceName.DEV_CONSOLE,
      'message',
    );
    return '👋';
  }
}
