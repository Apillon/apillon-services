import { ComputingMicroservice } from '@apillon/lib';
import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const pathParameter = event.pathParameters?.proxy;
  const job_uuid = event.requestContext?.domainPrefix;
  const payload = JSON.stringify(event.body || {});

  console.log(event);

  if (!pathParameter) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid request' }),
    };
  }

  try {
    const serviceResponse = await new ComputingMicroservice(
      null,
    ).sendJobMessage(payload, job_uuid);

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
