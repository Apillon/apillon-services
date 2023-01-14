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
import { AuthenticationApiContext } from '../../context';
import { AttestationEmailDto } from './dtos/attestation-email.dto';
import { Identity } from './models/identity.model';
import {
  IdentityState,
  JwtTokenType,
  AuthenticationErrorCode,
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
import { AuthenticationWorker } from '../../workers/authentication.worker';
import { u8aToHex } from '@polkadot/util';
import { IdentityCreateDto } from './dtos/identity-create.dto';

const aae = AuthAppErrors;

@Injectable()
export class IdentityService {
  async startUserIdentityGenProcess(
    context: AuthenticationApiContext,
    body: AttestationEmailDto,
  ): Promise<any> {
    const email = body.email;
    const token = generateJwtToken(JwtTokenType.IDENTITY_EMAIL_VERIFICATION, {
      email,
    });

    let identity = await new Identity({}, context).populateByUserEmail(
      context,
      email,
    );

    if (identity.exists()) {
      // If email was already attested -> deny process
      if (identity.state == IdentityState.ATTESTED) {
        throw new CodeException({
          status: HttpStatus.BAD_REQUEST,
          code: AuthenticationErrorCode.IDENTITY_EMAIL_IS_ALREADY_ATTESTED,
          errorCodes: AuthenticationErrorCode,
        });
      }
    } else {
      // If identity does not exist, create a new entry
      identity = new Identity({}, context);
    }

    // Lock email to identity object
    identity.populate({
      context: context,
      email: email,
      state: IdentityState.IN_PROGRESS,
      token: token,
    });

    try {
      if (!identity.exists()) {
        // CREATE NEW
        await identity.insert(SerializeFor.INSERT_DB);
      } else {
        // UPDATE EXISTING
        await identity.update(SerializeFor.INSERT_DB);
      }
    } catch (err) {
      await new Lmas().writeLog({
        context: context,
        logType: LogType.ERROR,
        message: `Error creating identity state for user with email ${email}'`,
        location: 'Authentication-API/identity/sendVerificationEmail',
        service: ServiceName.AUTHENTICATION_API,
        data: err,
      });
      throw err;
    }

    await new Mailing(context).sendMail({
      emails: [email],
      template: 'verify-identity',
      data: {
        actionUrl: `${env.AUTH_APP_URL}/identity/?token=${token}&email=${email}`,
      },
    });

    return { success: true };
  }

  async getUserIdentityGenState(
    context: AuthenticationApiContext,
    email: string,
  ): Promise<any> {
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      email,
    );

    if (!identity.exists()) {
      // Bad request because this resource is not present in our db - this
      // request should NEVER happen - it's not a resource addressing
      // problem, but a flow error
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    return { state: identity.state };
  }

  async generateIdentity(
    context: AuthenticationApiContext,
    body: IdentityCreateDto,
  ) {
    // Worker input parameters
    const parameters = {
      did_create_op: body.did_create_op,
      email: body.email,
      didUri: body.didUri,
    };

    let tokenData: any;
    try {
      tokenData = parseJwtToken(
        JwtTokenType.IDENTITY_EMAIL_VERIFICATION,
        body.token,
      );
    } catch (error) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_VERIFICATION_TOKEN,
        errorCodes: AuthenticationErrorCode,
      });
    }

    if (tokenData.email != body.email) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_VERIFICATION_FAILED,
        errorCodes: AuthenticationErrorCode,
      });
    }

    // Check if correct identity + state exists -> IN_PROGRESS
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      body.email,
    );

    if (
      !identity.exists() ||
      (identity.state != IdentityState.IN_PROGRESS &&
        identity.state != IdentityState.IDENTITY_VERIFIED)
    ) {
      // IDENTITY_VERIFIED just means that the process was broken before
      // the entity was successfully attested --> See a few lines below
      // This is done so we have better control of the process and for
      // analytical purposes
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_STATE,
        errorCodes: AuthenticationErrorCode,
      });
    }

    identity.populate({
      state: IdentityState.IDENTITY_VERIFIED,
    });

    await identity.update();

    if (
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      console.log('Starting DEV Authentication worker ...');

      // Directly calls Kilt worker -> USED ONLY FOR DEVELOPMENT!!
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };

      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.AUTHENTICATION_WORKER,
        {
          parameters,
        },
      );

      const worker = new AuthenticationWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await worker.runExecutor(parameters);
    } else {
      //send message to SQS
      await sendToWorkerQueue(
        env.AUTHENTICATION_AWS_WORKER_SQS_URL,
        WorkerName.AUTHENTICATION_WORKER,
        [parameters],
        null,
        null,
      );
    }

    return { success: true };
  }

  async getUserCredential(context: AuthenticationApiContext, email: string) {
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      email,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    return { credential: identity.credential };
  }

  async generateDIDDocumentDEV(context: AuthenticationApiContext, body: any) {
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
    const acc = (await generateAccount(body.mnemonic)) as KiltKeyringPair;
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    if (body.initial) {
      return {
        address: acc.address,
        pubkey: u8aToHex(encryption.publicKey),
      };
    }

    const didDoc = await Did.resolve(Did.getFullDidUriFromKey(authentication));

    if (didDoc && didDoc.document) {
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
