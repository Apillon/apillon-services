import { DefaultUserRole, ShortUrlDto } from '@apillon/lib';
import {
  Stage,
  TestUser,
  createTestBucket,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';
import * as request from 'supertest';

describe('URL shortener tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    adminTestUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.ADMIN,
    );

    testProject = await createTestProject(testUser, stage, 5000, 1);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Generate Short URL', async () => {
    const response = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: 'https://ipfs.apillon.io/ipfs/abc' })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(201);
    expect(response.body.data.data.id).toBeTruthy();

    const response2 = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: 'https://abcd.ipfs.nectarnode.io' })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response2.status).toBe(201);
    expect(response2.body.data.data.id).toBeTruthy();

    const response3 = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: 'https://ipfs.web3approved.com/ipns/asdiasdad12' })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response3.status).toBe(201);
    expect(response3.body.data.data.id).toBeTruthy();
  });

  test('Invalid url should return error', async () => {
    const response = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: 'https://google.com' })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(422);

    const response2 = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: 'apillon.io' })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response2.status).toBe(422);

    const response3 = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: 'apillon' })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response3.status).toBe(422);
  });
});
