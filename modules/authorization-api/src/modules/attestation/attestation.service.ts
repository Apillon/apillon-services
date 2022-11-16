import {
  JwtTokenType,
  Mailing,
  generateJwtToken,
  CodeException,
  SerializeFor,
  Ams,
  writeLog,
  LogType,
  env,
} from '@apillon/lib';
import { Request } from 'express';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { AttestationEmailDto } from './dto/attestation-email.dto';
import { Attestation } from './models/attestation.model';
import { AttestationState, ValidatorErrorCode } from '../../config/types';

@Injectable()
export class AttestationService {
  async startUserAttestationProcess(
    context: AuthorizationApiContext,
    body: AttestationEmailDto,
  ): Promise<any> {
    // What does this mean?

    const email = body.email;
    // TODO: How do we check for existing users
    const attestation_db = await new Attestation().populateByUserEmail(
      context,
      email,
    );

    if (
      attestation_db.exists() &&
      attestation_db.state != AttestationState.PENDING
    ) {
      throw new CodeException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: ValidatorErrorCode.USER_EMAIL_ALREADY_TAKEN,
        errorCodes: ValidatorErrorCode,
      });
    }

    const attestation: Attestation = new Attestation({}, context).populate({
      context: context,
      email: email,
    });

    // Lock email to attestation object
    attestation.state = AttestationState.IN_PROGRESS;

    try {
      const conn = await context.mysql.start();
      await attestation.insert(SerializeFor.INSERT_DB, conn);
      await context.mysql.commit(conn);
    } catch (err) {
      writeLog(
        LogType.MSG,
        `Error creating attestation state for user with email ${email}'`,
        'attestation.service.ts',
        'sendVerificationEmail',
      );
    }

    const token = generateJwtToken(JwtTokenType.USER_CONFIRM_EMAIL, {
      email,
    });

    const email_context = {
      verification_link: `${env.AUTH_API_HOST}/verify/${token}`,
    };
    console.log('Base request ');

    await new Mailing().sendMail({
      emails: [email],
      subject: 'Identify verification',
      template: 'identityVerificationEmail',
      data: { ...email_context },
    });

    return HttpStatus.OK;
  }

  async verifyIdentityEmail(
    context: AuthorizationApiContext,
    token: string,
  ): Promise<any> {
    console.log('Verification identify email');

    return HttpStatus.OK;
  }
}
