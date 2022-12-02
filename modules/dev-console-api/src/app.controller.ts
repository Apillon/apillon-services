import { Lmas } from '@apillon/lib';
import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello() {
    await new Lmas().sendAdminAlert('This is a test message');
    return this.appService.getHello();
  }
}
