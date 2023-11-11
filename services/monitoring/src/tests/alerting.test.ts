import { ServiceName } from '@apillon/lib';
import { Stage, releaseStage, setupTest } from '../../test/setup';
import { Alerting } from '../alerting';

describe('Alerting integration test', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Alerting.sendMessageToSlack should send plain text message without attachments to slack', async () => {
    await Alerting.sendMessageToSlack(
      {
        message: 'Testing sending message to slack',
        service: ServiceName.LMAS,
        attachments: undefined,
      },
      stage.context,
    );
  });

  test.only('Alerting.sendMessageToSlack should send message with image attachment to slack', async () => {
    await Alerting.sendMessageToSlack(
      {
        message: 'Testing sending message with attached image to slack',
        service: ServiceName.LMAS,
        attachments: [
          {
            imageUrl:
              'https://apillon-url-screenshots.s3.eu-west-1.amazonaws.com/https%3A__apillon.io_',
          },
        ],
      },
      stage.context,
    );
  });
});
