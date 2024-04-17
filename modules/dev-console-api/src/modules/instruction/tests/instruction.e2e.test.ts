import {
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { Instruction } from '../models/instruction.model';

describe('Instructions tests', () => {
  let stage: Stage;

  let testUser: TestUser;

  let testInstruction: Instruction;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );

    testInstruction = await new Instruction({}, stage.context.devConsole)
      .populate({
        title: 'My test instruction',
        instructionType: 1,
        htmlContent: 'Banane',
        forRoute: 'my-test-route',
      })
      .insert();

    await new Instruction({}, stage.context.devConsole)
      .populate({
        title: 'Another instruction',
        instructionType: 1,
        htmlContent: 'Hruške',
        forRoute: 'my-awesome-route',
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Instructions CRUD tests', () => {
    test('User should be able to get instructions for path', async () => {
      const response = await request(stage.http)
        .get('/instructions')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    test('User should be able to get filtered instructions for path', async () => {
      const response = await request(stage.http)
        .get(`/instructions?forRoute=${testInstruction.forRoute}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0]?.title).toBe(`My test instruction`);
      expect(response.body.data[0]?.instructionType).toBe(1);
      expect(response.body.data[0]?.htmlContent).toBe('Banane');
      expect(response.body.data[0]?.forRoute).toBe('my-test-route');
    });

    test('User should NOT be able to get instructions if not logged in', async () => {
      const response = await request(stage.http).get(
        `/instructions?forRoute=${testInstruction.forRoute}`,
      );
      expect(response.status).toBe(401);
    });
  });
});
