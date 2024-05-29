import {
  CacheKeyPrefix,
  CacheKeyTTL,
  StorageMicroservice,
  runCachedFunction,
} from '@apillon/lib';
import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const pathParameter = event.pathParameters?.proxy;

  if (!pathParameter) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid request' }),
    };
  }

  try {
    return await runCachedFunction(
      `${CacheKeyPrefix.URL_SHORTENER}:${pathParameter}`,
      async () => getTargetUrl(pathParameter),
      CacheKeyTTL.EXTRA_LONG * 24, // one day
    );
  } catch (error) {
    console.error(error);
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({
        message: error.message || 'Internal server error',
      }),
    };
  }
};

async function getTargetUrl(pathParameter: string) {
  const serviceResponse = await new StorageMicroservice(null).getTargetUrl(
    pathParameter,
  );

  return {
    statusCode: 302,
    headers: {
      Location: serviceResponse.data,
    },
    body: '',
  };
}
