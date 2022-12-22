import {
  Mailing,
  generateJwtToken,
  CodeException,
  SerializeFor,
  LogType,
  parseJwtToken,
  env,
  AppEnvironment,
  Lmas,
  ServiceName,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { AttestationEmailDto } from './dtos/attestation-email.dto';
import { Attestation } from './models/attestation.model';
import {
  AttestationState,
  JwtTokenType,
  AuthorizationErrorCode,
  AuthAppErrors,
} from '../../config/types';
import { generateKeypairs, generateAccount } from '../../lib/kilt';
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
import { IdentityCreateDto } from './dtos/identity-create.dto';

const aae = AuthAppErrors;

@Injectable()
export class AttestationService {
  async startUserAttestationProcess(
    context: AuthorizationApiContext,
    body: AttestationEmailDto,
  ): Promise<any> {
    const email = body.email;
    const token = generateJwtToken(JwtTokenType.ATTEST_EMAIL_VERIFICATION, {
      email,
    });

    let attestation = await new Attestation({}, context).populateByUserEmail(
      context,
      email,
    );

    if (attestation.exists()) {
      // If email was already attested -> deny process
      if (attestation.state == AttestationState.ATTESTED) {
        return { success: false, message: aae.EMAIL_ALREADY_EXIST };
      }
    } else {
      // If attestation does not exist, create a new entry
      attestation = new Attestation({}, context);
    }

    // Lock email to attestation object
    attestation.populate({
      context: context,
      email: email,
      state: AttestationState.IN_PROGRESS,
      token: token,
    });

    try {
      if (!attestation.exists()) {
        // CREATE NEW
        await attestation.insert(SerializeFor.INSERT_DB);
      } else {
        // UPDATE EXISTING
        await attestation.update(SerializeFor.INSERT_DB);
      }
    } catch (err) {
      await new Lmas().writeLog({
        context: context,
        logType: LogType.ERROR,
        message: `Error creating attestation state for user with email ${email}'`,
        location: 'AUTHORIZATION-API/attestation/sendVerificationEmail',
        service: ServiceName.AUTHORIZATION,
      });
      throw err;
    }

    await new Mailing(context).sendMail({
      emails: [email],
      template: 'verify-identity',
      data: {
        actionUrl: `${env.AUTH_APP_URL}/attestation/?token=${token}&email=${email}`,
      },
    });

    return { success: true };
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
      // Bad request because this resource is not present in our db - this
      // request should NEVER happen - it's not a resource addressing
      // problem, but a flow error
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthorizationErrorCode.ATTEST_DOES_NOT_EXIST,
        errorCodes: AuthorizationErrorCode,
      });
    }

    return { state: attestation.state };
  }

  async generateIdentity(
    context: AuthorizationApiContext,
    body: IdentityCreateDto,
  ) {
    // Worker input parameters
    const parameters = {
      did_create_op: body.did_create_op,
      email: body.email,
      didUri: body.didUri,
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

    // Check if correct attestation + state exists -> IN_PROGRESS
    const attestation = await new Attestation({}, context).populateByUserEmail(
      context,
      body.email,
    );

    if (
      !attestation.exists() ||
      attestation.state != AttestationState.IN_PROGRESS
    ) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthorizationErrorCode.ATTEST_INVALID_STATE,
        errorCodes: AuthorizationErrorCode,
      });
    }

    attestation.populate({
      state: AttestationState.IDENTITY_VERIFIED,
    });

    await attestation.update();

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
        [parameters],
        null,
        null,
      );
    }

    return { success: true };
  }

  async getUserCredential(context: AuthorizationApiContext, email: string) {
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
      await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    if (body.initial) {
      return {
        address: attesterAccount.address,
        pubkey: u8aToHex(encryption.publicKey),
      };
    }

    const didDoc = await Did.resolve(Did.getFullDidUriFromKey(authentication));

    if (didDoc && didDoc.document) {
      console.log('DID already on chain. Nothing to do ...');
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
      // DEV - no trigger to LMAS
      throw 'Full DID was not successfully created.';
    }

    return {
      address: attesterAccount.address,
      pubkey: u8aToHex(encryption.publicKey),
    };
  }
}
