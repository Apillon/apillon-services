import { ComputingMicroservice } from '@apillon/lib';
import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  const job_uuid = event.requestContext?.domainPrefix;
  const payload = event.body;

  console.log(event);

  if (event.httpMethod !== 'POST' || !job_uuid || !payload) {
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
