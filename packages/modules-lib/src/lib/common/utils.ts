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
