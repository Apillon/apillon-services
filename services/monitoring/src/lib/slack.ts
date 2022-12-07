import { env } from '@apillon/lib';
import { WebClient, LogLevel } from '@slack/web-api';

export class Slack {
  private client: WebClient;
  constructor() {
    this.client = new WebClient(env.SLACK_TOKEN, {
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
  async publishMessage(channelId: string, text: string) {
    try {
      // Call the chat.postMessage method using the built-in WebClient
      const result = await this.client.chat.postMessage({
        token: env.SLACK_TOKEN,
        channel: channelId,
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
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

export async function postToSlack(
  message: string,
  serviceName: string,
  level: 'message' | 'warning' | 'alert' = 'message',
) {
  const severityText = {
    message: {
      emojis: ':loudspeaker:',
      target: '',
      intro: `Message from ${serviceName} (${env.APP_ENV})`,
    },
    warning: {
      emojis: ':zap::warning::zap:',
      target: '@here',
      intro: `WARNING from ${serviceName} (${env.APP_ENV})`,
    },
    alert: {
      emojis: ':bangbang::rotating_light::bangbang:',
      target: '@channel',
      intro: `ALERT from ${serviceName} (${env.APP_ENV})`,
    },
  };

  const slack = new Slack();
  try {
    const channelId = await slack.findChannel(env.SLACK_CHANNEL);
    await slack.publishMessage(
      channelId,
      `${severityText[level].emojis}\n*${severityText[level].intro}:*\n\n${message}\n\n${severityText[level].target}`,
    );
  } catch (err) {
    console.log('Failed to post to Slack :', err);
  }
}
