import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import {
  CreateProductHuntCommentDto,
  ReferralMicroservice,
} from '@apillon/lib';

@Injectable()
export class ProductHuntService {
  async getComment(context: DevConsoleApiContext) {
    return (await new ReferralMicroservice(context).getProductHuntComment())
      .data;
  }

  async createComment(
    context: DevConsoleApiContext,
    body: CreateProductHuntCommentDto,
  ) {
    return (
      await new ReferralMicroservice(context).createProductHuntComment(body)
    ).data;
  }
}
