import {
  CacheKeyPrefix,
  CacheKeyTTL,
  StorageMicroservice,
  runCachedFunction,
} from '@apillon/lib';
import { APIGatewayProxyResult } from 'aws-lambda';

export const handler: (
  event: any,
) => Promise<
  | APIGatewayProxyResult
  | { statusCode: any; headers: { [key: string]: string }; body: string }
> = async (event) => {
  const pathParameter = event.pathParameters?.proxy;

  if (!pathParameter) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Invalid request' }),
    };
  }

  try {
    const [shortCode, ...additionalPath] = pathParameter.split('/');
    return await runCachedFunction<APIGatewayProxyResult>(
      `${CacheKeyPrefix.URL_SHORTENER}:${shortCode}`,
      async () => getTargetUrl(shortCode, additionalPath.join('/')),
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

async function getTargetUrl(shortCode: string, additionalPath: string) {
  const { data: fullUrl } = await new StorageMicroservice(null).getTargetUrl(
    shortCode,
  );

  const [baseUrl, queryParams] = fullUrl.split('?');
  const Location = additionalPath
    ? `${baseUrl}/${additionalPath}${queryParams ? `?${queryParams}` : ''}`
    : fullUrl;

  return {
    statusCode: 302,
    headers: { Location, 'Access-Control-Allow-Origin': '*' },
    body: '',
  };
}
