/*
https://docs.nestjs.com/providers#services
*/

import { Scs } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class ProjectService {
  async getProjectCredit(context: ApillonApiContext) {
    return (
      await new Scs(context).getProjectCredit(context.apiKey.project_uuid)
    ).data;
  }
}
