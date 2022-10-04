import { TestContext } from '../../helpers/context';
import { releaseStage, setupTest, Stage } from '../../helpers/setup';
import { createTestUser, TestUser } from '../../helpers/user';
import * as request from 'supertest';
import { CreateUserDto } from 'dev-console-api/src/modules/user/dtos/create-user.dto';

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

  test('Should be able to register user', async () => {
    const payload = new CreateUserDto().fake();

    const response = await request(stage.http)
      .post('/user/register')
      .send(payload.serialize());

    expect(response.status).toBe(201);
  });
});
