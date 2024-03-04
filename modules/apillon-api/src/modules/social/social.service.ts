import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import {
  BaseProjectQueryFilter,
  CreateSpaceDto,
  SocialMicroservice,
} from '@apillon/lib';

@Injectable()
export class SocialService {
  async listHubs(context: ApillonApiContext, query: BaseProjectQueryFilter) {
    return (await new SocialMicroservice(context).listSpaces(query)).data;
  }

  async createHub(context: ApillonApiContext, body: CreateSpaceDto) {
    return (await new SocialMicroservice(context).createSpace(body)).data;
  }
}
