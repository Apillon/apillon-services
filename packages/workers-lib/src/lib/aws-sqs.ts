import { env } from '@apillon/lib';
import * as aws from 'aws-sdk';

export function createSqsClient() {
  return new aws.SQS({
    accessKeyId: env.AWS_KEY,
    secretAccessKey: env.AWS_SECRET,
    region: env.AWS_REGION,
    apiVersion: '2012-11-05',
  });
}

export async function sendToWorkerQueue(
  queueUrl: string,
  workerName: string,
  msgData: Array<any>,
  id: number,
  parameters: any[] = null,
): Promise<void> {
  const sqs = createSqsClient();
  let errCount = 0;
  const errMsgs = [];
  const promises = [];
  for (const msg of msgData) {
    const message = {
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
    };
    if (!parameters) {
      delete message.MessageAttributes.parameters;
    }
    promises.push(
      new Promise<void>((resolve, reject) => {
        sqs.sendMessage(message, (err, data) => {
          if (err) {
            console.log('sendToWorkerQueue: Error sending SQS message!', err);
            errCount++;
            errMsgs.push(err.message);
            reject(err);
          }
          if (data) {
            // console.log(`sendToWorkerQueue: Sending SQS message result: ${JSON.stringify(data)}`);
            // console.log('sendToWorkerQueue: Sending SQS message successful');
          }
          resolve();
        });
      }),
    );
  }
  await Promise.all(promises);
  if (errCount) {
    //await writeWorkerLog(WorkerLogStatus.ERROR, 'Errors detected while sending messages to queue!', errMsgs, null);
    console.warn(
      'Errors detected while sending messages to queue!',
      JSON.stringify(errMsgs),
    );
  }
}
