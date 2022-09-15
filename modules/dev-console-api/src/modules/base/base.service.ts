import { Injectable } from '@nestjs/common';

@Injectable()
export class BaseService {
  getRoot(): any {
    return {
      name: 'ATv2 dev-console API',
      description: '',
      uptime: process.uptime(),
      version: process.env.npm_package_version,
    };
  }
}
