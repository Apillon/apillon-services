import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/test')
  async getUserAuth(): Promise<any> {
    return await this.appService.callAuthService();
  }

  @Get('/test-logging')
  async testLogging(@Query() query: any): Promise<any> {
    return await this.appService.testLogging(query?.count || 10);
  }
}
