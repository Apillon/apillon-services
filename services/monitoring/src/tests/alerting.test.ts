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
        blocks: undefined,
      },
      stage.context,
    );
  });

  test('Alerting.sendMessageToSlack should send message with image and buttons to slack', async () => {
    await Alerting.sendMessageToSlack(
      {
        message: 'Testing sending message with attached image to slack',
        service: ServiceName.LMAS,
        blocks: [
          {
            type: 'image',
            alt_text:
              'https://apillon-url-screenshots.s3.eu-west-1.amazonaws.com/https%3A__apillon.io_',
            image_url:
              'https://apillon-url-screenshots.s3.eu-west-1.amazonaws.com/https%3A__apillon.io_',
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { text: 'Button 1', type: 'plain_text' },
                url: 'https://console-api.apillon.io/',
              },
              {
                type: 'button',
                text: { text: 'Button 2', type: 'plain_text' },
                url: 'https://console-api.apillon.io/',
              },
            ],
          },
        ],
        channel: 'website-reviews',
      },
      stage.context,
    );
  });
});
