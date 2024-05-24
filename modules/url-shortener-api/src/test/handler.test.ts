import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from '../handler'; // replace with your actual file path
import { setupTest } from '../../test/helpers/setup';
import { Stage } from '@apillon/tests-lib';
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

  it('should return a 302 redirect with a valid URL', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: {
        proxy: validShortUrlId,
      },
    };
    const context: Partial<Context> = {};

    const result = (await handler(
      event as APIGatewayEvent,
      context as Context,
      null,
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(302);
    expect(result.headers?.Location).toBe(validTargetUrl);
  });

  it('should return a 400 error when path parameter is missing', async () => {
    const event: Partial<APIGatewayEvent> = {};
    const context: Partial<Context> = {};

    const result = (await handler(
      event as APIGatewayEvent,
      context as Context,
      null,
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(
      JSON.stringify({ message: 'Path parameter is required' }),
    );
  });

  it('should return a 500 error when Lambda invocation fails', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: {
        proxy: 'test-path',
      },
    };
    const context: Partial<Context> = {};

    const result = (await handler(
      event as APIGatewayEvent,
      context as Context,
      null,
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(result.body).toContain('Internal server error');
  });
});
