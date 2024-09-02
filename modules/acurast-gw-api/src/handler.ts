import { ComputingMicroservice, safeJsonParse } from '@apillon/lib';
import type { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const function_uuid = event.requestContext?.domainPrefix;

  if (event.httpMethod !== 'POST' || !function_uuid) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid request' }),
    };
  }

  const blockedHeadersRegex = new RegExp('^(X-|CloudFront-|Via).*$');
  const headers = Object.keys(event.headers)
    .filter((key) => !blockedHeadersRegex.test(key))
    .reduce((obj, key) => {
      obj[key] = event.headers[key];
      return obj;
    }, {});

  const payload = JSON.stringify({
    body: safeJsonParse(event.body, {}),
    headers,
    path: event.path,
    queryStringParameters: event.queryStringParameters,
    multiValueQueryStringParameters: event.multiValueQueryStringParameters,
    pathParameters: event.pathParameters,
  });

  console.log({ event });
  console.log({ payload: JSON.stringify(payload) });

  try {
    const serviceResponse = await new ComputingMicroservice(
      null,
    ).executeCloudFunction(JSON.stringify(payload), function_uuid);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(serviceResponse),
    };
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
