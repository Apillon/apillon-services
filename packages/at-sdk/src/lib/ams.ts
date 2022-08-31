import * as AWS from 'aws-sdk';
import { getEnvSecrets } from '../config/env';
import { AmsEventType } from '../config/types';
export async function IsUserAuthenticated(
  userId: number,
  projectId: number,
  securityToken: string,
) {
  const env = await getEnvSecrets();

  const amsLambda = new AWS.Lambda({
    apiVersion: '2015-03-31',
    region: env.AWS_REGION,
  });

  const data = {
    eventName: AmsEventType.USER_AUTH,
    userId,
    projectId,
    securityToken,
  };

  const params: AWS.Lambda.InvocationRequest = {
    FunctionName: env.AT_AMS_FUNCTION_NAME,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(data),
  };

  // eslint-disable-next-line sonarjs/prefer-immediate-return
  const amsResponse = await new Promise((resolve, reject) => {
    amsLambda.invoke(params, (err, response) => {
      if (err) {
        console.error('Error invoking lambda!', err);
        reject(err);
      }
      resolve(response);
    });
  });

  //TODO: do something with AMS response?

  return amsResponse;
}
