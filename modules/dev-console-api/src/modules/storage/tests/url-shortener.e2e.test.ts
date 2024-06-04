import {
  Stage,
  TestUser,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import * as request from 'supertest';
import { env } from '@apillon/lib';
import { Project } from '../../project/models/project.model';

describe('URL shortener tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testProject: Project;

  const shortUrlDomain = env.SHORTENER_DOMAIN;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject = await createTestProject(testUser, stage, 5000, 1);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Generate Short URL', async () => {
    const url1 = 'https://ipfs.apillon.io/ipfs/abc';
    const url2 = 'https://abcd.ipfs.nectarnode.io';
    const url3 = 'https://ipfs.web3approved.com/ipns/asdiasdad12';

    let response = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: url1 })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.targetUrl).toBe(url1);
    expect(response.body.data.url).toBe(
      `${shortUrlDomain}/${response.body.data.id}`,
    );

    response = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: url2 })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.targetUrl).toBe(url2);
    expect(response.body.data.url).toBe(
      `${shortUrlDomain}/${response.body.data.id}`,
    );

    response = await request(stage.http)
      .post(`/storage/hosting/short-url`)
      .send({ targetUrl: url3 })
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeTruthy();
    expect(response.body.data.targetUrl).toBe(url3);
    expect(response.body.data.url).toBe(
      `${shortUrlDomain}/${response.body.data.id}`,
    );
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
