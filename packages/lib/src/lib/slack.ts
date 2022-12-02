import axios from 'axios';
import { env } from '../config/env';

export async function postToSlack(message: string, serviceName: string) {
  try {
    const data = {
      text: `[${env.APP_ENV}][${serviceName}]\n${message}`,
      channel: env.MONITORING_SLACK_CHANNEL,
      username: 'Apillon bot',
    };

    const res = await axios.post(env.MONITORING_SLACK_WEBHOOK, data);

    if (res.status !== 200) {
      throw new Error(`Invalid response status: ${res?.status}`);
    }
  } catch (err) {
    console.log('Failed to post to Slack :', err);
  }
}
