import {
  Mailing,
  generateJwtToken,
  SerializeFor,
  LogType,
  env,
  AppEnvironment,
  Lmas,
  ServiceName,
} from '@apillon/lib';
import axios from 'axios';
import { Identity } from './models/identity.model';
import {
  IdentityState,
  JwtTokenType,
  AuthenticationErrorCode,
  AuthApiEmailType,
  ApillonSupportedCTypes,
  APILLON_SELF_SIGNED_PROOF_TYPE,
  ApillonSelfSignedProof,
  DEFAULT_VERIFIABLECREDENTIAL_TYPE,
  APILLON_VERIFIABLECREDENTIAL_TYPE,
  HttpStatus,
  DidCreateOp,
} from '../../config/types';

import { KiltKeyringPair, SignExtrinsicCallback } from '@kiltprotocol/types';
import {
  Claim,
  ConfigService,
  connect,
  Did,
  Credential,
  Utils,
  SubmittableExtrinsic,
  DidUri,
  ICredential,
} from '@kiltprotocol/sdk-js';
import * as validUrl from 'valid-url';
import { BN, hexToU8a, u8aToHex } from '@polkadot/util';
// Dtos
import { IdentityCreateDto } from '@apillon/lib';
import { AttestationDto } from '@apillon/lib';
import { IdentityDidRevokeDto } from '@apillon/lib';
import { VerificationEmailDto } from '@apillon/lib';
import {
  assertionSigner,
  createAttestationRequest,
  createCompleteFullDid,
  createPresentation,
  generateAccount,
  generateKeypairs,
  generateMnemonic,
  getCtypeSchema,
  getFullDidDocument,
  getNextNonce,
} from '../../lib/kilt';
import { AuthenticationCodeException } from '../../lib/exceptions';
import {
  prepareAttestationRequest,
  prepareDIDCreateRequest,
  prepareDIDRevokeRequest,
} from '../../lib/utils/transaction-utils';
import { sendBlockchainServiceRequest } from '../../lib/utils/blockchain-utils';

export class IdentityMicroservice {
  static async sendVerificationEmail(
    event: { body: VerificationEmailDto },
    context,
  ): Promise<any> {
    const email = event.body.email;
    const token = generateJwtToken(JwtTokenType.IDENTITY_VERIFICATION, {
      email,
    });
    let auth_app_page = 'registration';

    let identity = await new Identity({}, context).populateByUserEmail(
      context,
      email,
    );

    const verificationEmailType = event.body.type;
    if (verificationEmailType == AuthApiEmailType.GENERATE_IDENTITY) {
      // This is the start process of the identity generation, so we need
      // to do some extra stuff before we can start the process
      if (identity.exists()) {
        // If email was already attested -> deny process
        if (identity.state == IdentityState.ATTESTED) {
          throw new AuthenticationCodeException({
            code: AuthenticationErrorCode.IDENTITY_EMAIL_IS_ALREADY_ATTESTED,
            status: HttpStatus.BAD_REQUEST,
          });
        }
      } else {
        // If identity does not exist, create a new entry
        identity = new Identity({}, context);
      }

      // Lock email to identity object
      identity.populate({
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
      verificationEmailType == AuthApiEmailType.RESTORE_CREDENTIAL ||
      verificationEmailType == AuthApiEmailType.REVOKE_DID
    ) {
      if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
        throw new AuthenticationCodeException({
          code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
          status: HttpStatus.NOT_FOUND,
        });
      }
      auth_app_page = 'restore';
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
        actionUrl: `${env.AUTH_APP_URL}/${auth_app_page}/?token=${token}&email=${email}&type=${verificationEmailType}`,
      },
    });

    return { success: true };
  }

  static async getIdentityGenProcessState(
    { query: email },
    context,
  ): Promise<any> {
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      email,
    );

    if (!identity.exists()) {
      // Bad request because this resource is not present in our db - this
      // request should NEVER happen - it's not a resource addressing
      // problem, but a flow error
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return { state: identity.state };
  }

  static async generateIdentity(event: { body: IdentityCreateDto }, context) {
    const params = {
      did_create_op: event.body.did_create_op as DidCreateOp,
      email: event.body.email,
      didUri: event.body.didUri,
    };

    // Check if correct identity + state exists -> IN_PROGRESS
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      params.email,
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
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_STATE,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    identity.populate({
      state: IdentityState.IDENTITY_VERIFIED,
    });

    // Single transaction locks the pro
    await identity.update();

    // Generate (retrieve) attester did data
    const attesterKeypairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);

    // Init Kilt essentials
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    let decrypted: any;
    try {
      // Decrypt incoming payload -> DID creation TX generated on FE
      decrypted = Utils.Crypto.decryptAsymmetricAsStr(
        {
          box: hexToU8a(params.did_create_op.payload.message),
          nonce: hexToU8a(params.did_create_op.payload.nonce),
        },
        params.did_create_op.senderPubKey,
        u8aToHex(attesterKeypairs.keyAgreement.secretKey),
      );
    } catch (error) {
      await new Lmas().writeLog({
        message: error,
        logType: LogType.ERROR,
        location: 'Authentication-API/identity/authentication.worker',
        service: ServiceName.AUTHENTICATION_API,
        data: { email: params.email, didUri: params.didUri, error: error },
      });
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    if (decrypted) {
      const payload = JSON.parse(decrypted);
      const data = hexToU8a(payload.data);
      const signature = hexToU8a(payload.signature);

      const didCreationEx: SubmittableExtrinsic = api.tx.did.create(data, {
        sr25519: signature,
      });

      const conn = await context.mysql.start();

      // Prepare blockchain service request
      const request = await prepareDIDCreateRequest(
        context,
        didCreationEx,
        identity,
        conn,
      );

      console.log('Sending DID create EX to BCS ...');
      await new Lmas().writeLog({
        logType: LogType.INFO,
        message: `Sending DID create EX to BCS ...'`,
        location: 'AUTHENTICATION-API/identity/authentication.worker',
        service: ServiceName.AUTHENTICATION_API,
        data: { email: params.email, didUri: params.didUri },
      });

      // Send request to the blockchain service
      await sendBlockchainServiceRequest(context, request);

      // Update collection status
      identity.state = IdentityState.IN_PROGRESS;
      await identity.update(SerializeFor.UPDATE_DB, conn);

      await conn.commit();
    } else {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return { success: true };
  }

  static async revokeIdentity(event: { body: IdentityDidRevokeDto }, context) {
    const email = event.body.email;

    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      email,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
      });
    }

    // We need to the api instantiated
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    const conn = await context.mysql.start();

    const identifier = Did.toChain(identity.didUri as DidUri);

    const endpointsCountForDid = await api.query.did.didEndpointsCount(
      identifier,
    );

    const depositReclaimEx = api.tx.did.reclaimDeposit(
      identifier,
      endpointsCountForDid,
    );

    // Prepare blockchain service request
    const request = await prepareDIDRevokeRequest(
      context,
      depositReclaimEx,
      identity,
      conn,
    );

    console.log('Sending DID revoke EX to BCS ...');
    await new Lmas().writeLog({
      logType: LogType.INFO,
      message: `Sending DID revoke EX to BCS ...'`,
      location: 'AUTHENTICATION-API/identity/authentication.worker',
      service: ServiceName.AUTHENTICATION_API,
      data: { email: email, didUri: identity.didUri },
    });

    // Send request to the blockchain service
    await sendBlockchainServiceRequest(context, request);

    identity.state = IdentityState.REVOKED;
    await identity.update();

    return { success: true };
  }

  static async attestation(event: { body: AttestationDto }, context) {
    const email = event.body.email;
    const didUri = event.body.didUri;

    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      email,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
      });
    }

    // We need to the api instantiated
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    const attesterKeypairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAcc = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;
    const attesterDidDoc = await getFullDidDocument(attesterKeypairs);
    const attesterDidUri = attesterDidDoc.uri;

    const { attestationRequest, credential } = createAttestationRequest(
      email,
      attesterDidUri,
      didUri as DidUri,
      JSON.parse(event.body.credential) as ICredential,
    );

    const attestation = api.tx.attestation.add(
      attestationRequest.claimHash,
      attestationRequest.cTypeHash,
      null,
    );

    const nextNonce = new BN(await getNextNonce(attesterDidUri));

    // Prepare claim extrinsic
    const emailClaimEx = await Did.authorizeTx(
      attesterDidUri,
      attestation,
      async ({ data }) => ({
        signature: attesterKeypairs.assertionMethod.sign(data),
        keyType: attesterKeypairs.assertionMethod.type,
      }),
      attesterAcc.address,
      { txCounter: nextNonce },
    );

    // Prepare blockchain service request
    const request = await prepareAttestationRequest(
      context,
      emailClaimEx,
      identity,
    );

    await new Lmas().writeLog({
      logType: LogType.INFO,
      message: 'Sending ATTESTATION EX to KILT BC ...',
      location: 'AUTHENTICATION-API/identity/authentication.worker',
      service: ServiceName.AUTHENTICATION_API,
      data: { email: email, didUri: didUri },
    });

    // Send request to the blockchain service
    await sendBlockchainServiceRequest(context, request);

    // Save the generated credential to the identity -> It's not yet attested
    identity.credential = JSON.stringify(credential);
    await identity.update();

    return { success: true };
  }

  static async getUserIdentityCredential(event: { query: string }, context) {
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      event.query,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return { credential: identity.credential };
  }

  static async generateDevResources(event: { body: any }, _context) {
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
    // await connect(env.KILT_NETWORK_TEST);
    const api = ConfigService.get('api');
    let wellKnownDidconfig;
    let mnemonic;

    // Generate mnemonic
    if (event.body.mnemonic) {
      mnemonic = event.body.mnemonic;
    } else if (event.body.domain_linkage_only) {
      mnemonic = env.KILT_ATTESTER_MNEMONIC;
    } else {
      mnemonic = generateMnemonic();
    }

    // generate keypairs
    const {
      authentication,
      keyAgreement,
      assertionMethod,
      capabilityDelegation,
    } = await generateKeypairs(mnemonic);

    // generate account
    const account = generateAccount(mnemonic) as KiltKeyringPair;

    // First check if we have the required balance
    let balance = parseInt(
      (await api.query.system.account(account.address)).data.free.toString(),
    );

    if (balance < 3) {
      console.log(`Requesting tokens for account ${account.address}`);

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

      while (balance < 3) {
        balance = parseInt(
          (
            await api.query.system.account(account.address)
          ).data.free.toString(),
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log(`Balance: ${balance}`);
      }
    }

    const document = await createCompleteFullDid(
      account,
      {
        authentication: authentication,
        keyAgreement: keyAgreement,
        assertionMethod: assertionMethod,
        capabilityDelegation: capabilityDelegation,
      },
      (async ({ data }) => ({
        signature: authentication.sign(data),
        keyType: authentication.type,
      })) as SignExtrinsicCallback,
    );

    if (event.body.domain_linkage) {
      const domainLinkage = event.body.domain_linkage;
      let origin = domainLinkage.origin;

      if (!origin) {
        return { error: 'domain_linkage: Origin must be provided!!' };
      }

      console.log(`Creating domain linkage for ${origin}`);
      if (!validUrl.isUri(origin)) {
        throw new Error('The origin is not a valid url');
      }

      const domainClaimContents = {
        origin,
      };

      const claim = Claim.fromCTypeAndClaimContents(
        getCtypeSchema(ApillonSupportedCTypes.DOMAIN_LINKAGE),
        domainClaimContents,
        document.uri,
      );

      const credential = Credential.fromClaim(claim);

      const assertionKey = document.assertionMethod?.[0];

      if (!assertionKey) {
        throw new Error(
          'Full DID doesnt have assertion key: Please add assertion key',
        );
      }

      const domainLinkageCredential = await createPresentation(
        credential,
        await assertionSigner({
          assertion: assertionMethod,
          didDocument: document,
        }),
      );

      const claimContents = domainLinkageCredential.claim.contents;
      if (!domainLinkageCredential.claim.owner && !claimContents.origin) {
        throw new Error('Claim do not content an owner or origin');
      }

      Did.validateUri(credential.claim.owner);
      const didUri = credential.claim.owner;
      if (typeof claimContents.origin !== 'string') {
        throw new Error('claim contents id is not a string');
      } else if (!validUrl.isUri(claimContents.origin)) {
        throw new Error('The claim contents origin is not a valid url');
      } else {
        origin = claimContents.origin;
      }

      const credentialSubject = {
        id: didUri,
        origin: event.body.domain_linkage.origin,
        rootHash: domainLinkageCredential.rootHash,
      };

      const issuanceDate = new Date().toISOString();
      const { claimerSignature, rootHash } = domainLinkageCredential;
      // const id = toCredentialIRI(credential.rootHash);

      await Did.verifyDidSignature({
        expectedVerificationMethod: 'assertionMethod',
        signature: hexToU8a(claimerSignature.signature),
        keyUri: claimerSignature.keyUri,
        message: Utils.Crypto.coToUInt8(rootHash),
      });

      // add self-signed proof
      const proof: ApillonSelfSignedProof = {
        type: APILLON_SELF_SIGNED_PROOF_TYPE,
        proofPurpose: 'assertionMethod',
        verificationMethod: claimerSignature.keyUri,
        signature: claimerSignature.signature,
        challenge: claimerSignature.challenge,
      };

      wellKnownDidconfig = {
        '@context':
          'https://identity.foundation/.well-known/did-configuration/v1',
        linked_dids: [
          {
            '@context': [
              'https://www.w3.org/2018/credentials/v1',
              'https://identity.foundation/.well-known/did-configuration/v1',
            ],
            issuer: didUri,
            issuanceDate,
            type: [
              DEFAULT_VERIFIABLECREDENTIAL_TYPE,
              'DomainLinkageCredential',
              APILLON_VERIFIABLECREDENTIAL_TYPE,
            ],
            credentialSubject,
            proof,
          },
        ],
      };
    }

    return {
      account: account.address,
      didUri: document.uri,
      didConfiguration: wellKnownDidconfig,
      mnemonic: mnemonic,
      encryptionPubKey: u8aToHex(keyAgreement.publicKey),
    };
  }
}
