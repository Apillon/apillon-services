import { CodeException, env } from '@apillon/lib';
import axios from 'axios';

export function getDiscordAuthURL() {
  return {
    url: `https://discord.com/api/oauth2/authorize?client_id=${
      env.DISCORD_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      env.DISCORD_REDIRECT_URI,
    )}&response_type=code&scope=identify%20email`,
  };
}

export async function getDiscordProfile(code: string): Promise<any> {
  const options = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: env.DISCORD_REDIRECT_URI,
    code,
  });
  const token = await axios.post(
    'https://discord.com/api/v10/oauth2/token',
    options,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'gzip,deflate,compress',
      },
    },
  );

  if (token.data.access_token) {
    const res = await axios.get('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${token.data.access_token}` },
    });
    return res?.data;
  }
  return null;
}

/**
 * Function to execute calls to Apillon-API from other services
 * @param apiKey key
 * @param apiKeySecret secret
 * @param method GET, POST
 * @param relativeUrl function endpoint
 * @param body POST body
 * @returns response from API
 */
export async function callApillonApi(
  apiKey: string,
  apiKeySecret: string,
  method: string,
  relativeUrl: string,
  body?: any,
) {
  const requestUrl = `${env.APILLON_API_URL}${relativeUrl}`;
  if (method == 'GET') {
    const response = await axios.get(requestUrl, {
      auth: {
        username: apiKey,
        password: apiKeySecret,
      },
    });
    return response.data;
  } else if (method == 'POST') {
    const response = await axios.post(requestUrl, body, {
      auth: {
        username: apiKey,
        password: apiKeySecret,
      },
    });
    return response.data;
  }

  throw new CodeException({
    status: 500,
    code: 500000,
    errorMessage: 'Method not supported',
    sourceFunction: 'callApillonApi',
  });
}
