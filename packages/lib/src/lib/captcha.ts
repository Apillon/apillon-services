import { LogType, ValidatorErrorCode } from '../config/types';
import { env, getEnvSecrets } from '../config/env';
import { CodeException } from './exceptions/exceptions';
import axios from 'axios';
import { writeLog } from './logger';

export type Captcha = { eKey: string; token: string };
/**
 * Given a captcha token, verify if the token is valid and the captcha has been successfully solved by the user
 * @param {string} captchaToken
 * @returns {Promise<boolean>}
 */
export async function checkCaptcha(captchaToken: string): Promise<boolean> {
  // if (
  //   [AppEnvironment.LOCAL_DEV, AppEnvironment.TEST].includes(
  //     env.APP_ENV as AppEnvironment,
  //   )
  // ) {
  //   return true;
  // }

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
    const response = await axios.post('https://api.prosopo.io/siteverify', {
      token,
      secret,
    });

    if (!response.data?.verified)
      throwCodeException(ValidatorErrorCode.CAPTCHA_INVALID);
  } catch (err) {
    writeLog(LogType.ERROR, 'Error verifying captcha!', err);
    throwCodeException(ValidatorErrorCode.CAPTCHA_INVALID);
  }

  return true;
}

const throwCodeException = (code: ValidatorErrorCode) => {
  throw new CodeException({
    status: 422,
    code,
    errorCodes: ValidatorErrorCode,
  });
};
