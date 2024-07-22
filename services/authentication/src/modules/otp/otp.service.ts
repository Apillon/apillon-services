import {
  GenerateOtpDto,
  ValidateOtpDto,
  ModelValidationException,
  ValidatorErrorCode,
  env,
  Mailing,
  EmailDataDto,
} from '@apillon/lib';
import { Otp } from './models/otp.model';
import { ServiceContext } from '@apillon/service-lib';
export class OtpService {
  static async generateOtp(
    event: { body: GenerateOtpDto },
    context: ServiceContext,
  ) {
    const expireTime = new Date();
    expireTime.setMinutes(
      expireTime.getMinutes() + env.AUTH_OTP_EXPIRATION_IN_MIN,
    );
    // Random 6 character code of uppercase letters & digits
    const code = Array(6)
      .fill(null)
      .map(() => Math.random().toString(36).substring(2, 3).toUpperCase())
      .join('');
    const otp = new Otp({ ...event.body, expireTime, code }, context);
    await otp.validateOrThrow(ModelValidationException, ValidatorErrorCode);
    const createdOtp = await otp.insert();

    // To-DO Add template once it is ready
    /*await new Mailing(context).sendMail(
      new EmailDataDto({
        mailAddresses: [event.body.email],
        templateName: 'TO-DO',
        templateData: {
          code,
        },
      }),
    );*/

    return createdOtp;
  }

  static async validateOtp(
    event: { body: ValidateOtpDto },
    context: ServiceContext,
  ) {
    const otp = await new Otp({}, context).populateActiveByEmailAndCode(
      event.body.email,
      event.body.code,
    );

    if (!otp.exists()) {
      return false;
    }

    otp.used = true;
    await otp.update();
    return true;
  }
}
