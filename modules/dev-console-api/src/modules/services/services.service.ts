import { Injectable } from '@nestjs/common';

import { DevConsoleApiContext } from '../../context';

import { Service } from './models/service.model';

@Injectable()
export class ServicesService {
  async createService(context: DevConsoleApiContext, body: Service): Promise<Service> {
    return await body.insert();
  }
}
