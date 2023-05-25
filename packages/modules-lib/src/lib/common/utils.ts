import { AppEnvironment } from '@apillon/lib';
import { env } from '@apillon/lib';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';

export async function verifyCaptcha(
  token: string,
  secret: string,
): Promise<boolean> {
  try {
    const req = axios.create({
      baseURL: 'https://hcaptcha.com',
      responseType: 'json',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept-Encoding': 'gzip,deflate,compress',
      },
    });
    const data = new FormData();
    data.append('response', token);
    data.append('secret', secret);
    const captchaVerify: AxiosResponse = await req.post('/siteverify', data);

    return captchaVerify.status === 200 && captchaVerify.data.success;

    // console.log(captchaVerify);
  } catch (err) {
    console.log('error verifying captcha!');
    console.error(err);
    throw err;
  }
}

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

export async function getOauthSessionToken(apiKey: string, apiSecret: string) {
  // TODO: Maybe not the most efficient way??? Could just do an OR
  let protocol = '';
  if (
    env.APP_ENV === AppEnvironment.TEST ||
    env.APP_ENV == AppEnvironment.LOCAL_DEV
  ) {
    protocol = 'http://';
  }

  const requestUrl = `${protocol}${env.APILLON_API_HOST}:${env.APILLON_API_PORT}/auth/session-token`;
  const response = await axios.get(requestUrl, {
    auth: {
      username: apiKey,
      password: apiSecret,
    },
  });
  return response.data;
}
