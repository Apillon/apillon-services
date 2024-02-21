import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { ChainType, SqlModelStatus, SubstrateChain } from '@apillon/lib';
import { Post } from '@apillon/social/src/modules/subsocial/models/post.model';
import { Space } from '@apillon/social/src/modules/subsocial/models/space.model';
import {
  Stage,
  TestUser,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';

describe('Social tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testSpace: Space;
  let testPost: Post;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage);
    testProject2 = await createTestProject(testUser2, stage);

    //insert test space
    testSpace = await new Space({}, stage.socialContext)
      .fake()
      .populate({
        status: SqlModelStatus.DRAFT,
        project_uuid: testProject.project_uuid,
        about: 'Test space',
      })
      .insert();

    //Insert test post
    testPost = await new Post({}, stage.socialContext)
      .fake()
      .populate({
        space_id: testSpace.id,
        status: SqlModelStatus.DRAFT,
        project_uuid: testProject.project_uuid,
      })
      .insert();

    await new Wallet(
      {
        chain: SubstrateChain.SUBSOCIAL,
        chainType: ChainType.SUBSTRATE,
        seed: 'disorder reveal crumble deer axis slush unique answer catalog junk hazard damp',
        address: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
        nextNonce: 1,
      },
      stage.blockchainContext,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Social Space tests', () => {
    test('User should be able to list spaces', async () => {
      const response = await request(stage.http)
        .get(`/social/spaces?project_uuid=${testProject.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.space_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.status).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.about).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER spaces list', async () => {
      const response = await request(stage.http)
        .get(`/social/spaces?project_uuid=${testProject2.project_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to get space by uuid', async () => {
      const response = await request(stage.http)
        .get(`/social/spaces/${testSpace.space_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.space_uuid).toBeTruthy();
      expect(response.body.data.status).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.about).toBeTruthy();
    });

    test('User should recieve 422 if invalid body', async () => {
      const response = await request(stage.http)
        .post(`/social/spaces`)
        .send({})
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should NOT be able to create space in ANOTHER user project', async () => {
      const response = await request(stage.http)
        .post(`/social/spaces`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'Test space',
          about: 'Test about content',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to create new space', async () => {
      const response = await request(stage.http)
        .post(`/social/spaces`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'Test space',
          about: 'Test about content',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.space_uuid).toBeTruthy();
      expect(response.body.data.status).toBe(SqlModelStatus.DRAFT);

      const tmpSpace = await new Space({}, stage.socialContext).populateByUUID(
        response.body.data.space_uuid,
        'space_uuid',
      );
      expect(tmpSpace.exists()).toBeTruthy();
    });
  });

  describe('Social post tests', () => {
    test('User should be able to list posts', async () => {
      const response = await request(stage.http)
        .get(`/social/spaces/${testSpace.space_uuid}/posts`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.post_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.status).toBeTruthy();
      expect(response.body.data.items[0]?.title).toBeTruthy();
      expect(response.body.data.items[0]?.body).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER SPACE posts list', async () => {
      const response = await request(stage.http)
        .get(`/social/spaces/${testSpace.space_uuid}/posts`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to get post by uuid', async () => {
      const response = await request(stage.http)
        .get(
          `/social/spaces/${testSpace.space_uuid}/posts/${testPost.post_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.post_uuid).toBeTruthy();
      expect(response.body.data.status).toBeTruthy();
      expect(response.body.data.title).toBeTruthy();
      expect(response.body.data.body).toBeTruthy();
    });

    test('User should recieve 422 if invalid body', async () => {
      const response = await request(stage.http)
        .post(`/social/spaces/${testSpace.space_uuid}/posts`)
        .send({})
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should NOT be able to create post in ANOTHER user project', async () => {
      const response = await request(stage.http)
        .post(`/social/spaces/${testSpace.space_uuid}/posts`)
        .send({
          space_uuid: testSpace.space_uuid,
          title: 'Test post',
          body: 'Test body content',
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should NOT be able to create new post in INACTIVE space', async () => {
      const response = await request(stage.http)
        .post(`/social/spaces/${testSpace.space_uuid}/posts`)
        .send({
          space_uuid: testSpace.space_uuid,
          title: 'Test post',
          body: 'Test body content',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(500);
      expect(response.body.code).toBe(50019004);
    });

    test('User should be able to create new post in space', async () => {
      testSpace.status = SqlModelStatus.ACTIVE;
      testSpace.spaceId = '1';
      await testSpace.update();

      const response = await request(stage.http)
        .post(`/social/spaces/${testSpace.space_uuid}/posts`)
        .send({
          space_uuid: testSpace.space_uuid,
          title: 'Test post',
          body: 'Test body content',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.post_uuid).toBeTruthy();
      expect(response.body.data.status).toBe(SqlModelStatus.DRAFT);

      const tmpPost = await new Post({}, stage.socialContext).populateByUUID(
        response.body.data.post_uuid,
        'post_uuid',
      );
      expect(tmpPost.exists()).toBeTruthy();
    });
  });
});
