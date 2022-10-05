import * as request from 'supertest';
import { TestContext } from '../../../../test/helpers/context';
import { releaseStage, setupTest, Stage } from '../../../../test/helpers/setup';
import { createTestUser, TestUser } from '../../../../test/helpers/user';
import { CreateUserDto } from '../dtos/create-user.dto';

describe('Auth tests', () => {
  let stage: Stage;
  let ctx: TestContext;

  let testUser: TestUser;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Should be able to get users', async () => {
    const response = await request(stage.http).get('/user');
    expect(response.status).toBe(200);
  });

  test('Should be able to register user', async () => {
    const payload = new CreateUserDto().fake();

    const response = await request(stage.http)
      .post('/user/register')
      .send(payload.serialize());

    expect(response.status).toBe(201);
  });
});
