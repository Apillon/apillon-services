import {
  Mailing,
  generateJwtToken,
  CodeException,
  SerializeFor,
  LogType,
  env,
  AppEnvironment,
  Lmas,
  ServiceName,
} from '@apillon/lib';
import axios from 'axios';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { Identity } from './models/identity.model';
import {
  IdentityState,
  JwtTokenType,
  AuthenticationErrorCode,
  AuthApiEmailType,
  ApillonSupportedCTypes,
} from '../../config/types';
import {
  generateMnemonic,
  generateKeypairs,
  generateAccount,
  getCtypeSchema,
} from '../../lib/kilt';
import {
  IClaimContents,
  ICredential,
  KiltKeyringPair,
  SignResponseData,
} from '@kiltprotocol/types';
import {
  Attestation,
  Blockchain,
  Claim,
  ConfigService,
  connect,
  Did,
  DidUri,
  Credential,
} from '@kiltprotocol/sdk-js';
import {
  QueueWorkerType,
  sendToWorkerQueue,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { WorkerName } from '../../workers/worker-executor';
import { AuthenticationWorker } from '../../workers/authentication.worker';
import { IdentityCreateDto } from './dtos/identity-create.dto';
import { IdentityDidRevokeDto } from './dtos/identity-did-revoke.dto';
import { VerificationEmailDto } from './dtos/identity-verification-email.dto';

@Injectable()
export class IdentityService {
  async sendVerificationEmail(
    context: AuthenticationApiContext,
    body: VerificationEmailDto,
  ): Promise<any> {
    const email = body.email;
    const token = generateJwtToken(JwtTokenType.IDENTITY_VERIFICATION, {
      email,
    });

    let identity = await new Identity({}, context).populateByUserEmail(
      context,
      email,
    );

    const verificationEmailType = body.type;
    if (verificationEmailType == AuthApiEmailType.GENERATE_IDENTITY) {
      // This is the start process of the identity generation, so we need
      // to do some extra stuff before we can start the process
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
    } else if (
      (verificationEmailType == AuthApiEmailType.RESTORE_CREDENTIAL ||
        verificationEmailType == AuthApiEmailType.REVOKE_DID) &&
      (!identity.exists() || identity.state != IdentityState.ATTESTED)
    ) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    await new Lmas().writeLog({
      logType: LogType.INFO,
      message: `Sending verification email to ${email}`,
      location: 'AUTHENTICATION-API/identity/',
      service: ServiceName.AUTHENTICATION_API,
    });

    await new Mailing(context).sendMail({
      emails: [email],
      template: verificationEmailType,
      data: {
        actionUrl: `${env.AUTH_APP_URL}/identity/?token=${token}&email=${email}&type=${verificationEmailType}`,
      },
    });

    return { success: true };
  }

  async getIdentityGenProcessState(
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

  async getUserIdentityCredential(
    context: AuthenticationApiContext,
    email: string,
  ) {
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

  async revokeIdentity(
    context: AuthenticationApiContext,
    body: IdentityDidRevokeDto,
  ) {
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      body.email,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        errorCodes: AuthenticationErrorCode,
      });
    }

    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    // This is the attester account, used elsewhere in the code
    const depositPayerAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    const identifier = Did.toChain(identity.didUri as DidUri);

    const endpointsCountForDid = await api.query.did.didEndpointsCount(
      identifier,
    );
    const depositClaimExtrinsic = api.tx.did.reclaimDeposit(
      identifier,
      endpointsCountForDid,
    );

    try {
      await new Lmas().writeLog({
        logType: LogType.INFO,
        message: `Propagating DID delete TX to KILT BC ...`,
        location: 'AUTHENTICATION-API/identity/identity-revoke',
        service: ServiceName.AUTHENTICATION_API,
      });
      await Blockchain.signAndSubmitTx(
        depositClaimExtrinsic,
        depositPayerAccount,
      );
    } catch (error) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        location: 'Authentication-API/identity/identity-revoke',
        service: ServiceName.AUTHENTICATION_API,
        data: error,
      });
      throw error;
    }

    return { success: true };
  }

  async generateDevResources(context: AuthenticationApiContext, body: any) {
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

    console.log('Received body ', body);
    // Generate mnemonic
    let mnemonic;
    if (body.mnemonic) {
      mnemonic = body.mnemonic;
    } else {
      mnemonic = generateMnemonic();
    }

    // generate keypairs
    const { authentication, assertion, keyAgreement } = await generateKeypairs(
      mnemonic,
    );
    // generate account
    const account = (await generateAccount(mnemonic)) as KiltKeyringPair;

    // First check if we have the required balance
    let balance = parseInt(
      (await api.query.system.account(account.address)).data.free.toString(),
    );

    while (balance < 3) {
      const reqTestTokens = `https://faucet-backend.peregrine.kilt.io/faucet/drop`;
      await (async () => {
        axios
          .post(reqTestTokens, { address: account.address })
          .then((resp: any) => {
            console.log('Response ', resp.status);
          })
          .catch((error: any) => {
            return {
              error: `Error when requesting token from peregrine faucet: ${error}`,
            };
          });
      })();
      balance = parseInt(
        (await api.query.system.account(account.address)).data.free.toString(),
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`Balance: ${balance}`);
    }

    const didUri: DidUri = Did.getFullDidUriFromKey(authentication);
    let wellKnownDidconfig: any;

    let didDoc = await Did.resolve(Did.getFullDidUriFromKey(authentication));
    if (!didDoc || !didDoc.document) {
      const fullDidCreationTx = await Did.getStoreTx(
        {
          authentication: [authentication],
          keyAgreement: [keyAgreement],
          assertionMethod: [assertion],
        },
        account.address,
        async ({ data }) => ({
          signature: authentication.sign(data),
          keyType: authentication.type,
        }),
      );

      console.log('Submitting document create TX to BC ...');
      await Blockchain.signAndSubmitTx(fullDidCreationTx, account);

      const encodedFullDid = await api.call.did.query(Did.toChain(didUri));
      const { document } = Did.linkedInfoFromChain(encodedFullDid);

      if (!document) {
        // DEV - no trigger to LMAS
        throw 'Full DID was not successfully created.';
      }
    }

    didDoc = await Did.resolve(Did.getFullDidUriFromKey(authentication));
    const didResolveResult = await Did.resolve(didUri);

    if (body.domain_linkage) {
      const domainLinkage = body.domain_linkage;
      if (!domainLinkage.origin) {
        return { error: 'domain_linkage: Origin must be provided!!' };
      }

      const domainLinkageCType = getCtypeSchema(
        ApillonSupportedCTypes.DOMAIN_LINKAGE,
      );
      const claimContents: IClaimContents = {
        id: didUri,
        origin: domainLinkage.origin,
      };

      const claim = Claim.fromCTypeAndClaimContents(
        domainLinkageCType,
        claimContents,
        didUri,
      );
      const domainLinkageCredential = Credential.fromClaim(
        claim,
      ) as ICredential;

      const { cTypeHash, claimHash } = Attestation.fromCredentialAndDid(
        domainLinkageCredential,
        didUri,
      );
      const dLAttestTx = api.tx.attestation.add(claimHash, cTypeHash, null);

      console.log('Submitting domain linkage attestation to BC ...');
      // We authorize the call using the attestation key of the Dapps DID
      const submitDLAttestTx = await Did.authorizeTx(
        didUri,
        dLAttestTx,
        async ({ data }) => ({
          signature: assertion.sign(data),
          keyType: assertion.type,
        }),
        account.address,
      );

      // Since DIDs can not hold any balance, we pay for the transaction using our blockchain account
      const result = await Blockchain.signAndSubmitTx(
        submitDLAttestTx,
        account,
      );

      if (result.isError) {
        throw 'Attestation failed';
      } else {
        console.log('Attestation successful');
      }

      const challenge =
        '0x3ce56bb25ea3b603f968c302578e77e28d3d7ba3c7a8c45d6ebd3f410da766e1';
      const assertionMethodKeyId =
        didResolveResult.document.assertionMethod[0].id;
      const domainLinkagePresentation = await Credential.createPresentation({
        credential: domainLinkageCredential,
        signCallback: async ({ data }) =>
          ({
            signature: assertion.sign(data),
            keyType: assertion.type,
            keyUri: `${didUri}${assertionMethodKeyId}`,
          } as SignResponseData),
        challenge,
      });

      const credentialSubject = {
        ...domainLinkagePresentation.claim.contents,
        rootHash: domainLinkagePresentation.rootHash,
      };

      const encodedAttestationDetails =
        await api.query.attestation.attestations(
          domainLinkagePresentation.rootHash,
        );

      const issuer = Attestation.fromChain(
        encodedAttestationDetails,
        domainLinkagePresentation.claim.cTypeHash,
      ).owner;

      const issuanceDate = new Date().toISOString();

      const signature = domainLinkagePresentation.claimerSignature;
      if (!signature) {
        throw new Error('Signature is required.');
      }

      const proof = {
        type: 'ApillonSelfSigned2023',
        proofPurpose: 'assertionMethod',
        verificationMethod: signature.keyUri,
        signature: signature.signature,
        challenge: signature.challenge,
      };

      // TODO: Maybe move to config
      wellKnownDidconfig = {
        '@context':
          'https://identity.foundation/.well-known/did-configuration/v1',
        linked_dids: [
          {
            '@context': [
              'https://www.w3.org/2018/credentials/v1',
              'https://identity.foundation/.well-known/did-configuration/v1',
            ],
            issuer,
            issuanceDate,
            type: [
              'VerifiableCredential',
              'DomainLinkageCredential',
              'ApillonCredential2023',
            ],
            credentialSubject,
            proof,
          },
        ],
      };
    }

    return {
      mnemonic: mnemonic,
      address: account.address,
      // pubkey: u8aToHex(encryption.publicKey),
      wellKnownDidconfig: wellKnownDidconfig,
    };
  }
}
