import { ComputingMicroservice } from '@apillon/lib';
import type { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const function_uuid = event.requestContext?.domainPrefix;

  const blockedHeadersRegex = new RegExp('^(X-|CloudFront-|Via).*$');
  const headers = Object.keys(event.headers)
    .filter((key) => !blockedHeadersRegex.test(key))
    .reduce((obj, key) => {
      obj[key] = event.headers[key];
      return obj;
    }, {});

  const payload = {
    body: event.body ? JSON.parse(event.body) : {},
    headers,
    path: event.path,
    queryStringParameters: event.queryStringParameters,
    multiValueQueryStringParameters: event.multiValueQueryStringParameters,
    pathParameters: event.pathParameters,
  };

  console.log(event);
  console.log(JSON.stringify(payload));

  if (event.httpMethod !== 'POST' || !function_uuid || !payload) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid request' }),
    };
  }

  try {
    const serviceResponse = await new ComputingMicroservice(
      null,
    ).executeCloudFunction(JSON.stringify(payload), function_uuid);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
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
