import {
  Ams,
  CodeException,
  JwtTokenType,
  Mailing,
  generateJwtToken,
} from '@apillon/lib';
import { ValidatorErrorCode } from '../../config/types';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';

@Injectable()
export class VerificationService {
  async sendVerificationEmail(
    context: AuthorizationApiContext,
    email: string,
  ): Promise<any> {
    // What does this mean?
    const res = await new Ams().emailExists(email);

    if (res.data.result === true) {
      throw new CodeException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ValidatorErrorCode.USER_EMAIL_ALREADY_TAKEN,
        errorCodes: ValidatorErrorCode,
      });
    }

    const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, {
      email,
    });

    const email_context = {
      verification_link: 'This is a link.',
      token: token,
    };

    await new Mailing().sendMail({
      emails: [email],
      subject: 'Identify verification',
      template: 'identityVerificationEmail',
      data: { ...email_context },
    });

    return HttpStatus.OK;
  }
}
