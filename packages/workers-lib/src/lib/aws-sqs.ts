import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { SendMessageCommandInput } from '@aws-sdk/client-sqs';

export function createSqsClient() {
  return new SQSClient({
    // credentials: {
    //   accessKeyId: env.AWS_KEY,
    //   secretAccessKey: env.AWS_SECRET,
    // },
    region: env.AWS_REGION,
  });
}

export async function sendToWorkerQueue(
  queueUrl: string,
  workerName: string,
  msgData: Array<any>,
  id: number,
  parameters: any[] = null,
  delaySeconds = 0,
): Promise<{ errCount: number; errMsgs: string[] }> {
  const sqs = createSqsClient();
  let errCount = 0;
  const errMsgs = [];
  const promises = [];
  for (const msg of msgData) {
    const message: SendMessageCommandInput = {
      // Remove DelaySeconds parameter and value for FIFO queues
      //  DelaySeconds: 10,
      MessageAttributes: {
        workerName: {
          DataType: 'String',
          StringValue: workerName,
        },
        ...(id
          ? {
              jobId: {
                DataType: 'String',
                StringValue: id.toString(),
              },
            }
          : {}),
        parameters: {
          DataType: 'String',
          StringValue: JSON.stringify(parameters),
        },
      },
      MessageBody: JSON.stringify(
        typeof msg.serialize == 'function' ? msg.serialize() : msg,
      ),
      // MessageDeduplicationId: 'TheWhistler',  // Required for FIFO queues
      // MessageGroupId: 'Group1',  // Required for FIFO queues
      QueueUrl: queueUrl,
      DelaySeconds: delaySeconds,
    };
    if (!parameters) {
      delete message.MessageAttributes.parameters;
    }
    const command = new SendMessageCommand(message);
    const promise = sqs.send(command).catch((err) => {
      console.log('sendToWorkerQueue: Error sending SQS message!', err);
      errCount++;
      errMsgs.push(err.message);
    });

    promises.push(promise);
  }
  await Promise.all(promises);
  if (errCount) {
    await new Lmas().writeLog({
      logType: LogType.ERROR,
      message: 'Errors detected while sending messages to queue',
      location: 'sendToWorkerQueue',
      service: ServiceName.GENERAL,
      data: {
        errCount,
        errMsgs: JSON.stringify(errMsgs),
      },
      sendAdminAlert: true,
    });
  }
  return { errCount, errMsgs };
}
