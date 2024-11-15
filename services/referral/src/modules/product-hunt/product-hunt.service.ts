import { CreateProductHuntCommentDto } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ProductHuntComment } from './models/product-hunt-comment.model';

export class ProductHuntService {
  static async getComment(_: unknown, context: ServiceContext) {
    const existingComment = await new ProductHuntComment(
      {},
      context,
    ).populateForUser();

    if (existingComment.exists()) {
      return existingComment.serialize();
    }

    return {};
  }

  static async createComment(
    event: { body: CreateProductHuntCommentDto },
    context: ServiceContext,
  ) {
    const existingComment = await new ProductHuntComment(
      {},
      context,
    ).populateForUser();

    if (existingComment.exists()) {
      existingComment.username = event.body.username;
      existingComment.url = event.body.url;
      existingComment.update();

      return existingComment.serialize();
    } else if (context.user.user_uuid) {
      const newComment = new ProductHuntComment({}, context).populate({
        username: event.body.username,
        url: event.body.url,
        user_uuid: context.user.user_uuid,
      });

      newComment.insert();
      return newComment.serialize();
    }
  }
}
