import { LogType, ServiceName, env } from '@apillon/lib';
import { Block, KnownBlock, LogLevel, WebClient } from '@slack/web-api';

export class Slack {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token, {
      logLevel: LogLevel.DEBUG,
    });
  }

  async findChannel(chanelName) {
    let conversationId;
    try {
      // Call the conversations.list method using the built-in WebClient
      const result = await this.client.conversations.list({
        token: env.SLACK_TOKEN,
      });

      for (const channel of result.channels) {
        if (channel.name === chanelName) {
          conversationId = channel.id;

          // Print result
          // console.log('Found conversation ID: ' + conversationId);
          return conversationId;
        }
      }
    } catch (error) {
      console.error('FIND CHANNEL:', error);
      console.log('token:', env.SLACK_TOKEN);
      console.log('channel:', env.SLACK_CHANNEL);
      throw error;
    }
  }

  // Post a message to a channel your app is in using ID and message text
  async publishMessage(
    channelId: string,
    text: string,
    blocks: (Block | KnownBlock)[],
  ) {
    try {
      blocks = [{ type: 'section', text: { type: 'mrkdwn', text } }, ...blocks];
      /*if (attachments?.length) {
        //image blocks
        attachments
          .filter((x) => x.image_url)
          .forEach((attachment) => {
            blocks.push({
              type: 'image',
              alt_text: attachment.image_url,
              image_url: attachment.image_url,
            });
          });
      }*/
      // Call the chat.postMessage method using the built-in WebClient
      // const result =
      await this.client.chat.postMessage({
        token: env.SLACK_TOKEN,
        channel: channelId,
        blocks,
        text: text,
        // You could also use a blocks[] array to send richer content
      });

      // Print result, which includes information about the message (like TS)
      // console.log(result);
    } catch (error) {
      console.error('PUBLISH MESSAGE:', error);
      console.log('token:', env.SLACK_TOKEN);
      console.log('channel:', env.SLACK_CHANNEL);
      throw error;
    }
  }
}

/**
 * Notify administrators of an event in the system via Slack.
 * Message is formatted and users are notified depending on severity level. Channel is set on env variable.
 * @param message Message to post on slack
 * @param serviceName Name of the origin service
 * @param logType level of severity of the message
 */
export async function postToSlack(
  message: string,
  serviceName: ServiceName,
  logType: LogType,
  channel = env.SLACK_CHANNEL,
  blocks: (Block | KnownBlock)[] = [],
) {
  const slackToken = env.SLACK_TOKEN;
  if (!slackToken) {
    return;
  }
  const slack = new Slack(slackToken);

  const severityText = {
    [LogType.MSG]: {
      emojis: ':loudspeaker:',
      target: '',
      intro: `Message from ${serviceName} (${env.APP_ENV})`,
    },
    [LogType.WARN]: {
      emojis: ':zap::warning::zap:',
      target: '@here',
      intro: `WARNING from ${serviceName} (${env.APP_ENV})`,
    },
    [LogType.ALERT]: {
      emojis: ':bangbang::rotating_light::bangbang:',
      target: '@channel',
      intro: `ALERT from ${serviceName} (${env.APP_ENV})`,
    },
  };

  try {
    const channelId = await slack.findChannel(channel);
    await slack.publishMessage(
      channelId,
      `${severityText[logType].emojis}\n*${severityText[logType].intro}:*\n\n${message}\n\n${severityText[logType].target}`,
      blocks,
    );
  } catch (err) {
    console.log('Failed to post to Slack :', err);
  }
}
