import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../handler'; // replace with your actual file path
import { setupTest } from '../../test/helpers/setup';
import { Stage, releaseStage } from '@apillon/tests-lib';
import { DbTables } from '@apillon/storage/src/config/types';

describe('Lambda Handler', () => {
  let stage: Stage;
  const validShortUrlId = 'test1';
  const validTargetUrl = 'https://ipfs.apillon.io/ipfs/12345';

  beforeAll(async () => {
    stage = await setupTest();

    stage.db.storage.paramExecute(`
    INSERT INTO ${DbTables.SHORT_URL} (id, status, targetUrl)
    VALUES ('${validShortUrlId}', 5, '${validTargetUrl}')
   `);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  it('should return a 302 redirect with a valid URL', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: {
        proxy: validShortUrlId,
      },
    };
    const context: Partial<Context> = {};

    const result = (await handler(
      event as APIGatewayEvent,
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(302);
    expect(result.headers?.Location).toBe(validTargetUrl);
  });

  it('should return a 400 error when path parameter is missing', async () => {
    const event: Partial<APIGatewayEvent> = {};

    const result = (await handler(
      event as APIGatewayEvent,
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify({ message: 'Invalid request' }));
  });

  it('should return a 404 error if short url does not exists', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: {
        proxy: 'test-path',
      },
    };
    const result = (await handler(
      event as APIGatewayEvent,
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(404);
    expect(result.body).toContain(
      'Short URL key is not valid or does not exists',
    );
  });
});
