import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { AppEnvironment, ValidatorErrorCode } from '../config/types';
import { env, getEnvSecrets } from '../config/env';
import { CodeException } from './exceptions/exceptions';

export type Captcha = { eKey: string; token: string };
/**
 * Given a captcha token, verify if the token is valid and the captcha has been successfully solved by the user
 * @param {string} captchaToken
 * @returns {Promise<boolean>}
 */
export async function checkCaptcha(captchaToken: string): Promise<boolean> {
  if (
    [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
      env.APP_ENV as AppEnvironment,
    )
  ) {
    return true;
  }

  await getEnvSecrets();

  if (!env.CAPTCHA_SECRET) {
    throwCodeException(ValidatorErrorCode.CAPTCHA_NOT_CONFIGURED);
  }

  if (!captchaToken) {
    throwCodeException(ValidatorErrorCode.CAPTCHA_NOT_PRESENT);
  }

  if (!(await verifyCaptcha(captchaToken))) {
    throwCodeException(ValidatorErrorCode.CAPTCHA_INVALID);
  }

  return true;
}

async function verifyCaptcha(
  token: string,
  secret: string = env.CAPTCHA_SECRET,
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
  } catch (err) {
    console.error('Error verifying captcha!', err);
    throw err;
  }
}

const throwCodeException = (code: ValidatorErrorCode) => {
  throw new CodeException({
    status: 422,
    code,
    errorCodes: ValidatorErrorCode,
  });
};
