import {
  Mailing,
  generateJwtToken,
  CodeException,
  SerializeFor,
  writeLog,
  LogType,
  parseJwtToken,
  env,
  AppEnvironment,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { AttestationEmailDto } from './dtos/attestation-email.dto';
import { Attestation } from './models/attestation.model';
import {
  AttestationState,
  JwtTokenType,
  AuthorizationErrorCode,
} from '../../config/types';
import { generateKeypairs, generateAccount } from '../../lib/kilt/utils';
import { KiltKeyringPair } from '@kiltprotocol/types';
import { Blockchain, ConfigService, connect, Did } from '@kiltprotocol/sdk-js';

import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';
import { AuthorizationWorker } from '../../workers/authorization.worker';
import { u8aToHex } from '@polkadot/util';
import { SlowBuffer } from 'buffer';
// import { u8aToHex } from '@polkadot/util';

@Injectable()
export class AttestationService {
  async startUserAttestationProcess(
    context: AuthorizationApiContext,
    body: AttestationEmailDto,
  ): Promise<any> {
    const email = body.email;
    // const attestation_db = await new Attestation().populateByUserEmail(
    //   context,
    //   email,
    // );

    // if (
    //   attestation_db.exists() &&
    //   attestation_db.state == AttestationState.ATTESTED
    // ) {
    //   return { success: false, message: 'Email already attested' };
    // }

    const attestation = new Attestation({}, context).populate({
      context: context,
      email: email,
    });

    const token = generateJwtToken(JwtTokenType.ATTEST_EMAIL_VERIFICATION, {
      email,
    });

    // Lock email to attestation object
    attestation.populate({
      state: AttestationState.IN_PROGRESS,
      token: token,
    });

    const conn = await context.mysql.start();
    try {
      await attestation.insert(SerializeFor.INSERT_DB, conn);
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      writeLog(
        LogType.ERROR,
        `Error creating attestation state for user with email ${email}'`,
        'attestation.service.ts',
        'sendVerificationEmail',
      );
      throw err;
    }

    const email_context = {
      verification_link: `http://${env.AUTH_API_HOST_FE}:${env.AUTH_API_PORT_FE}/attestation/?token=${token}`,
    };

    await new Mailing(context).sendCustomMail({
      emails: [email],
      subject: 'Identify verification',
      template: 'identityVerificationEmail',
      data: { ...email_context },
    });

    return { success: true };
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
        status: HttpStatus.NOT_FOUND,
        code: AuthorizationErrorCode.ATTEST_DOES_NOT_EXIST,
        errorCodes: AuthorizationErrorCode,
      });
    }

    attestation.state = AttestationState.VERIFIED;
    await attestation.update();

    return { message: 'OK' };
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
        status: HttpStatus.NOT_FOUND,
        code: AuthorizationErrorCode.ATTEST_DOES_NOT_EXIST,
        errorCodes: AuthorizationErrorCode,
      });
    }

    return { state: attestation.state };
  }

  async generateIdentity(context: AuthorizationApiContext, body: any) {
    // Worker input parameters
    const parameters = {
      ...body,
    };

    const tokenData = parseJwtToken(
      JwtTokenType.ATTEST_EMAIL_VERIFICATION,
      body.token,
    );

    if (tokenData.email != body.email) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthorizationErrorCode.ATTEST_INVALID_VERIFICATION_TOKEN,
        errorCodes: AuthorizationErrorCode,
      });
    }

    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      console.log('Starting DEV authorization worker ...');

      // Directly calls Kilt worker -> USED ONLY FOR DEVELOPMENT!!
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };

      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.AUTHORIZATION_WORKER,
        {
          parameters,
        },
      );

      const worker = new AuthorizationWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor(parameters);
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.AUTHORIZATION_AWS_WORKER_SQS_URL,
        WorkerName.AUTHORIZATION_WORKER,
        [...parameters],
        null,
        null,
      );
    }

    return { success: true };
  }

  async getUserCredential(context: AuthorizationApiContext, email: any) {
    const attestation = await new Attestation({}, context).populateByUserEmail(
      context,
      email,
    );

    if (
      !attestation.exists() ||
      attestation.state != AttestationState.ATTESTED
    ) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: AuthorizationErrorCode.ATTEST_DOES_NOT_EXIST,
        errorCodes: AuthorizationErrorCode,
      });
    }

    return { credential: attestation.credential };
  }

  async generateDIDDocumentDEV(context: AuthorizationApiContext, body: any) {
    // Used to issue did documents to test accounts -> Since the peregrine faucet
    // only allows 100PILT token per account, we need a new one everytime funds
    // are depleted ...
    // NOTE: Use this function to generate a testnet DID
    if (
      env.APP_ENV != AppEnvironment.TEST &&
      env.APP_ENV != AppEnvironment.LOCAL_DEV
    ) {
      throw 'Invalid request!';
    }

    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    const { authentication, encryption, assertion, delegation } =
      await generateKeypairs(body.mnemonic);
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    if (body.initial) {
      return attesterAccount.address;
    }

    if (body.encryption_key) {
      return u8aToHex(encryption.publicKey);
    }

    const didDoc = await Did.resolve(Did.getFullDidUriFromKey(authentication));

    if (didDoc && didDoc.document) {
      console.log('DID already on chain. Nothing to do ...');
      return didDoc.document;
    }

    const fullDidCreationTx = await Did.getStoreTx(
      {
        authentication: [authentication],
        keyAgreement: [encryption],
        assertionMethod: [assertion],
        capabilityDelegation: [delegation],
      },
      attesterAccount.address,
      async ({ data }) => ({
        signature: authentication.sign(data),
        keyType: authentication.type,
      }),
    );
    await Blockchain.signAndSubmitTx(fullDidCreationTx, attesterAccount);

    const didUri = Did.getFullDidUriFromKey(authentication);
    const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
    const { document } = Did.linkedInfoFromChain(encodedFullDid);

    if (!document) {
      throw 'Full DID was not successfully created.';
    }

    return document;
  }
}
