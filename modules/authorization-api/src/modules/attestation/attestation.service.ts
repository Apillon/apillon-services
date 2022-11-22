import {
  Mailing,
  generateJwtToken,
  CodeException,
  SerializeFor,
  writeLog,
  LogType,
  parseJwtToken,
  env,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { AttestationEmailDto } from './dto/attestation-email.dto';
import { Attestation } from './models/attestation.model';
import {
  AttestationState,
  JwtTokenType,
  ModuleValidatorErrorCode,
} from '../../config/types';
import { AttestationMnemonicDto } from './dto/attestation-mnemonic.dto';
import {
  extractAccFromMnemonic,
  generateKeypairs,
  setupCredsProposition,
  getOrCreateFullDid,
} from '../../lib/kilt/utils';
import { ICredential, KiltKeyringPair } from '@kiltprotocol/types';
import { Blockchain, ConfigService, Did } from '@kiltprotocol/sdk-js';
import { AttestationCreateDto } from './dto/attestation-create.dto';

@Injectable()
export class AttestationService {
  async startUserAttestationProcess(
    context: AuthorizationApiContext,
    body: AttestationEmailDto,
  ): Promise<any> {
    // What does this mean?

    const email = body.email;
    // // TODO: How do we check for existing users
    // const attestation_db = await new Attestation().populateByUserEmail(
    //   context,
    //   email,
    // );

    // // TODO: Handle
    // if (attestation_db.exists()) {
    //   throw new CodeException({
    //     status: HttpStatus.UNPROCESSABLE_ENTITY,
    //     code: ModuleValidatorErrorCode.USER_EMAIL_ALREADY_TAKEN,
    //     errorCodes: ModuleValidatorErrorCode,
    //   });
    // }

    const attestation = new Attestation({}, context).populate({
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
        LogType.ERROR,
        `Error creating attestation state for user with email ${email}'`,
        'attestation.service.ts',
        'sendVerificationEmail',
      );
    }

    const token = generateJwtToken(JwtTokenType.ATTEST_EMAIL_VERIFICATION, {
      email,
    });

    const email_context = {
      verification_link: `http://${env.AUTH_API_HOST}:${env.AUTH_API_PORT}/attestation/verify/${token}`,
    };

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
    const tokenData = parseJwtToken(
      JwtTokenType.ATTEST_EMAIL_VERIFICATION,
      token,
    );
    const attestation = await new Attestation({}, context).populateByUserEmail(
      context,
      tokenData.email,
    );

    if (
      !attestation.exists() ||
      attestation.state != AttestationState.IN_PROGRESS
    ) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: ModuleValidatorErrorCode.ATTEST_INVALID_STATE,
        errorCodes: ModuleValidatorErrorCode,
      });
    }

    attestation.state = AttestationState.VERIFIED;
    await attestation.update();

    return HttpStatus.OK;
  }

  async getUserAttestationState(
    context: AuthorizationApiContext,
    email: string,
  ): Promise<any> {
    const attestation = await new Attestation({}, context).populateByUserEmail(
      context,
      email,
    );

    if (!attestation.exists()) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: ModuleValidatorErrorCode.ATTEST_INVALID_REQUEST,
        errorCodes: ModuleValidatorErrorCode,
      });
    }

    return { state: attestation.state };
  }

  async generateFullDid(
    context: AuthorizationApiContext,
    body: AttestationMnemonicDto,
  ) {
    // TODO: MOVE TO FRONTEND
    const endUserMnemonic = body.mnemonic;
    console.log('Received mnemonic ', endUserMnemonic);

    const attesterAccount = (await extractAccFromMnemonic(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;
    const attesterKeyPairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);

    const didDocument = await getOrCreateFullDid(
      attesterAccount,
      attesterKeyPairs,
    );

    return { did: JSON.stringify(didDocument), didUri: didDocument.uri };
  }

  async attestCreate(
    context: AuthorizationApiContext,
    body: AttestationCreateDto,
  ) {
    const api = ConfigService.get('api');
    const claimerEmail = body.email;
    const claimerDidUri = body.didUri;

    const attesterAccount = (await extractAccFromMnemonic(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;
    const attesterKeyPairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);

    const attesterDidDoc = await getOrCreateFullDid(
      attesterAccount,
      attesterKeyPairs,
    );
    const attesterDidUri = attesterDidDoc.uri;

    const { creds, credsProposition } = setupCredsProposition(
      claimerEmail,
      attesterDidUri,
      claimerDidUri,
    );

    const auth = api.tx.attestation.add(
      credsProposition.claimHash,
      credsProposition.cTypeHash,
      null,
    );
    const authTx = await Did.authorizeTx(
      attesterDidUri,
      auth,
      async ({ data }) => ({
        signature: attesterKeyPairs.assertion.sign(data),
        keyType: attesterKeyPairs.assertion.type,
      }),
      attesterAccount.address,
    );

    writeLog(
      LogType.MSG,
      `'ATTESTATION => create authorization attestation...'`,
      'attestation.service.ts',
      'attestClaim',
    );

    await Blockchain.signAndSubmitTx(authTx, attesterAccount);
    const emailAttested = Boolean(
      await api.query.attestation.attestations(creds.rootHash),
    );

    writeLog(
      LogType.MSG,
      `ATTESTATION ${claimerEmail} attested => ${emailAttested}`,
      'attestation.service.ts',
      'attestClaim',
    );

    const presentation: ICredential = JSON.parse(JSON.stringify(creds));

    return { presentation: presentation };
  }
}
