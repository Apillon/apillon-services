import { APIGatewayEvent } from 'aws-lambda';
import { handler } from '../handler';
import { setupTest } from '../../test/helpers/setup';
import { Stage, releaseStage } from '@apillon/tests-lib';
import { DbTables } from '@apillon/storage/src/config/types';

describe('Lambda Handler', () => {
  let stage: Stage;
  const validShortUrlId1 = 'test1';
  const validShortUrlId2 = 'test2';
  const validShortUrlId3 = 'test3';
  const validShortUrlId4 = 'test4';
  const validTargetUrl = 'https://ipfs.apillon.io/ipfs/12345';
  const validTargetUrlWithPath =
    'https://ipfs.apillon.io/ipfs/12345/path/to/resource';
  const validTargetUrlWithQuery =
    'https://ipfs.apillon.io/ipfs/12345?query=param';
  const validTargetUrlWithPathAndQuery =
    'https://ipfs.apillon.io/ipfs/12345/path/to/resource?query=param';

  beforeAll(async () => {
    stage = await setupTest();

    stage.db.storage.paramExecute(`
      INSERT INTO ${DbTables.SHORT_URL} (id, status, targetUrl)
      VALUES
      ('${validShortUrlId1}', 5, '${validTargetUrl}'),
      ('${validShortUrlId2}', 5, '${validTargetUrlWithPath}'),
      ('${validShortUrlId3}', 5, '${validTargetUrlWithQuery}'),
      ('${validShortUrlId4}', 5, '${validTargetUrlWithPathAndQuery}')
    `);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  it('should return a 302 redirect with a valid URL', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: {
        proxy: validShortUrlId1,
      },
    };
    const result = await handler(event);

    expect(result.statusCode).toBe(302);
    expect(result.headers?.Location).toBe(validTargetUrl);
  });

  it('should return a 302 redirect with a valid URL and additional path', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: { proxy: `${validShortUrlId2}/path/to/resource` },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(302);
    expect(result.headers?.Location).toBe(
      `${validTargetUrlWithPath}/path/to/resource`,
    );
  });

  it('should return a 302 redirect with a valid URL and query params', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: { proxy: `${validShortUrlId3}?newQuery=newParam` },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(302);
    expect(result.headers?.Location).toBe(
      `${validTargetUrlWithQuery}&newQuery=newParam`,
    );
  });

  it('should return a 302 redirect with a valid URL, additional path, and query params', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: {
        proxy: `${validShortUrlId4}/new/path?newQuery=newParam`,
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(302);
    expect(result.headers?.Location).toBe(
      `${validTargetUrlWithPathAndQuery}/new/path&newQuery=newParam`,
    );
  });

  it('should return a 400 error when path parameter is missing', async () => {
    const event: Partial<APIGatewayEvent> = {};

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify({ message: 'Invalid request' }));
  });

  it('should return a 404 error if short url does not exist', async () => {
    const event: Partial<APIGatewayEvent> = {
      pathParameters: { proxy: 'non-existent-path' },
    };
    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(result.body).toContain(
      'Short URL key is not valid or does not exist',
    );
  });
});
