import { CreateProductHuntCommentDto, DefaultUserRole } from '@apillon/lib';
import { Stage, releaseStage, setupTest } from '../../../../test/setup';
import { ProductHuntService } from '../product-hunt.service';
import { DbTables } from '../../../config/types';

describe('Product Hunt Comment tests', () => {
  let stage: Stage;
  beforeAll(async () => {
    stage = await setupTest();
    stage.context.user = {
      userRoles: [DefaultUserRole.PROJECT_ADMIN],
      user_uuid: '0ed81a8c-9095-444d-82b7-c667660a3f1e',
    };
  });
  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('createProductHuntComment', () => {
    afterAll(async () => {
      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.PRODUCT_HUNT_COMMENT}`,
      );
    });

    test('User can create & update a product hunt comment', async () => {
      const dto = new CreateProductHuntCommentDto({}, stage.context).populate({
        url: 'https://www.producthunt.com/posts/1',
      });

      const createdProductHuntCommentResponse =
        await ProductHuntService.createComment({ body: dto }, stage.context);

      expect(createdProductHuntCommentResponse).toBeDefined();
      expect(createdProductHuntCommentResponse.id).toBeDefined();
      expect(createdProductHuntCommentResponse.url).toBe(dto.url);
      expect(createdProductHuntCommentResponse.createTime).toBeUndefined();

      const updateDto = new CreateProductHuntCommentDto(
        {},
        stage.context,
      ).populate({
        url: 'https://www.producthunt.com/posts/2',
      });

      const updatedProductHuntCommentResponse =
        await ProductHuntService.createComment(
          { body: updateDto },
          stage.context,
        );

      expect(updatedProductHuntCommentResponse).toBeDefined();
      expect(updatedProductHuntCommentResponse.id).toBe(
        createdProductHuntCommentResponse.id,
      );
      expect(updatedProductHuntCommentResponse.url).toBe(updateDto.url);
    });
  });

  describe('getProductHuntComment', () => {
    test("User cannot get a comment when it doesn't exist", async () => {
      const response = await ProductHuntService.getComment(null, stage.context);

      expect(response).toBeDefined();
      expect(response).toMatchObject({});
    });

    test('User can get a comment', async () => {
      const dto = new CreateProductHuntCommentDto({}, stage.context).populate({
        url: 'https://www.producthunt.com/posts/3',
      });
      const createdProductHuntCommentResponse =
        await ProductHuntService.createComment({ body: dto }, stage.context);

      const getResponse = await ProductHuntService.getComment(
        null,
        stage.context,
      );

      expect(getResponse).toBeDefined();
      expect(getResponse.id).toBe(createdProductHuntCommentResponse.id);
      expect(getResponse.url).toBe(dto.url);
      expect(getResponse.createTime).toBeDefined();
      expect(getResponse.updateTime).toBeDefined();
    });
  });
});
