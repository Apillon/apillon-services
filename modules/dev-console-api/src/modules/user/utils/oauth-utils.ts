import { env } from '@apillon/lib';
import axios from 'axios';

export async function getOauthSessionToken(apiKey: string, apiSecret: string) {
  const requestUrl = `${env.APILLON_API_URL}/auth/session-token`;
  const response = await axios.get(requestUrl, {
    auth: {
      username: apiKey,
      password: apiSecret,
    },
  });
  return response.data;
}
