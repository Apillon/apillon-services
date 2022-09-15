import { Controller, Get, Req } from '@nestjs/common';
import { BaseService } from './base.service';

@Controller()
export class BaseController {
  constructor(private readonly baseService: BaseService) {}

  @Get()
  getRoot(@Req() _request: any): any {
    return this.baseService.getRoot();
  }
}
