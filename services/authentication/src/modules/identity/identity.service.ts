import {
  Mailing,
  generateJwtToken,
  SerializeFor,
  LogType,
  env,
  Lmas,
  ServiceName,
  AttestationDto,
  writeLog,
} from '@apillon/lib';
import { Identity } from './models/identity.model';
import {
  IdentityState,
  JwtTokenType,
  AuthenticationErrorCode,
  AuthApiEmailType,
  ApillonSupportedCTypes,
  HttpStatus,
  DidCreateOp,
  Attester,
  KiltSignAlgorithm,
} from '../../config/types';

import { KiltKeyringPair } from '@kiltprotocol/types';
import {
  ConfigService,
  connect,
  Did,
  DidUri,
  ICredential,
} from '@kiltprotocol/sdk-js';
import { hexToU8a, u8aToHex } from '@polkadot/util';
// Dtos
import { IdentityCreateDto } from '@apillon/lib';
import { IdentityDidRevokeDto } from '@apillon/lib';
import { VerificationEmailDto } from '@apillon/lib';
import { IdentityLinkAccountDidDto } from '@apillon/lib';
import {
  createAttestationRequest,
  generateAccount,
  generateKeypairs,
  getCtypeSchema,
  getFullDidDocument,
} from '../../lib/kilt';
import { AuthenticationCodeException } from '../../lib/exceptions';
import { decryptAssymetric } from '../../lib/utils/crypto-utils';
import { sendBlockchainServiceRequest } from '../../lib/utils/blockchain-utils';
import {
  didRevokeRequestBc,
  attestationRequestBc,
  identityCreateRequestBc,
  accDidLinkRequestBc,
} from '../../lib/utils/transaction-utils';

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
    const inProgressStates = IdentityState.getProcessInProgressStates();

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

        if (inProgressStates.includes(identity.state)) {
          throw new AuthenticationCodeException({
            code: AuthenticationErrorCode.IDENTITY_REQUEST_IN_PROGRESS,
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
    const did_create_op: DidCreateOp = event.body.did_create_op as DidCreateOp;
    const claimerEmail = event.body.email;
    const claimerDidUri = event.body.didUri;
    const linkDidToAccount = event.body.linkParameters;

    const inProgressStates = IdentityState.getProcessInProgressStates();

    // Check if correct identity + state exists -> IN_PROGRESS
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      claimerEmail,
    );

    if (!identity.exists() || !inProgressStates.includes(identity.state)) {
      // IDENTITY_VERIFIED just means that the process was broken before
      // the entity was successfully attested --> See a few lines below
      // This is done so we have better control of the process and for
      // analytical purposes
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_STATE,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    await identity.setState(IdentityState.IDENTITY_VERIFIED);

    identity.populate({
      didUri: claimerDidUri,
    });

    // Generate (retrieve) attester did data
    const attesterKeypairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);

    // Init Kilt essentials
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    writeLog(LogType.INFO, 'Decrypting payload..');
    const decrypted = await decryptAssymetric(
      did_create_op.payload,
      did_create_op.senderPubKey,
      u8aToHex(attesterKeypairs.keyAgreement.secretKey),
    );

    let fullDidCreationTx = null;
    if (decrypted) {
      const payload = JSON.parse(decrypted);
      const data = hexToU8a(payload.data);
      const signature = hexToU8a(payload.signature);

      fullDidCreationTx = api.tx.did.create(data, {
        sr25519: signature,
      });
    } else {
      await new Lmas().writeLog({
        message: 'Decryption failed',
        logType: LogType.ERROR,
        location: 'Authentication-API/identity/authentication.worker',
        service: ServiceName.AUTHENTICATION_API,
      });
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    const bcsRequest = await identityCreateRequestBc(
      context,
      fullDidCreationTx,
      identity,
      did_create_op,
      linkDidToAccount,
    );

    // Don't update here, but in the request below
    await identity.setState(IdentityState.SUBMITTED_DID_CREATE_REQ, false);

    try {
      await identity.validate();
      await identity.update();
    } catch (error) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    writeLog(LogType.INFO, 'Sending blockchain request..');
    // Call blockchain server and submit batch request
    await sendBlockchainServiceRequest(context, bcsRequest);

    return { success: true };
  }

  static async attestClaim(event: { body: AttestationDto }, context) {
    const claimerEmail = event.body.email;
    const claimerDidUri: DidUri = event.body.didUri as DidUri;
    // This parameter is optional, since we can only perform attestaion
    const credentialRequest: ICredential = JSON.parse(
      event.body.credential,
    ) as ICredential;

    // Generate (retrieve) attester did data
    const attesterKeypairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    // TODO: Account could be just saved in
    // ENV, no need to generate it every time actually
    const attesterAcc = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    // DID
    const attesterDidDoc = await getFullDidDocument(attesterKeypairs);
    const attesterDidUri = attesterDidDoc.uri;

    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      claimerEmail,
    );

    if (identity.exists() && identity.state == IdentityState.ATTESTED) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_STATE,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // Init Kilt essentials
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    // Prepare identity instance and credential structure
    writeLog(LogType.INFO, 'Preparing attestation request..');
    const { attestationRequest, credential } = createAttestationRequest(
      claimerEmail,
      attesterDidUri,
      claimerDidUri,
      credentialRequest,
    );

    const attestation = api.tx.attestation.add(
      attestationRequest.claimHash,
      attestationRequest.cTypeHash,
      null,
    );

    const claimerCredential = {
      credential: {
        ...credential,
      },
      claimerSignature: {
        keyType: KiltSignAlgorithm.SR25519,
        keyUri: claimerDidUri,
      },
      name: 'Email',
      status: 'pending',
      attester: Attester.APILLON,
      cTypeTitle: getCtypeSchema(ApillonSupportedCTypes.EMAIL).title,
    };

    identity.populate({
      credential: claimerCredential,
      didUri: claimerDidUri ? claimerDidUri : null,
      email: claimerEmail,
    });
    // Set state but don't update
    await identity.setState(IdentityState.SUBMITTED_ATTESATION_REQ, false);

    try {
      await identity.validate();
      await identity.update();
    } catch (error) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_INVALID_REQUEST,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    writeLog(LogType.INFO, 'Creating attestation TX ..');
    const attestationTx = await Did.authorizeTx(
      attesterDidUri,
      attestation,
      async ({ data }) => ({
        signature: attesterKeypairs.assertionMethod.sign(data),
        keyType: attesterKeypairs.assertionMethod.type,
      }),
      attesterAcc.address,
    );

    const bcsRequest = await attestationRequestBc(
      context,
      attestationTx,
      identity,
    );

    writeLog(LogType.INFO, 'Sending blockchain request..');
    // Call blockchain server and submit batch request
    await sendBlockchainServiceRequest(context, bcsRequest);
  }

  static async getUserIdentity(
    event: { query: string; includeDidUri: boolean },
    context,
  ) {
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

    return {
      credential: identity.credential,
      didUri: event.includeDidUri ? identity.didUri : null,
    };
  }

  static async linkAccountDid(
    event: { body: IdentityLinkAccountDidDto },
    context,
  ) {
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      event.body.email,
    );

    if (!identity.exists() || identity.state != IdentityState.DID_CREATED) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
      });
    }

    const didUri = event.body.didUri as DidUri;
    const linkParameters = event.body.linkParameters;
    const attesterKeypairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAcc = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    // Create account link tx
    const authorizedAccountLinkingTx = await Did.authorizeTx(
      didUri,
      linkParameters,
      async ({ data }) => ({
        signature: attesterKeypairs.authentication.sign(data),
        keyType: attesterKeypairs.authentication.type,
      }),
      attesterAcc.address,
    );

    const bcsRequest = await accDidLinkRequestBc(
      context,
      authorizedAccountLinkingTx,
      identity,
    );

    writeLog(LogType.INFO, 'Sending blockchain request..');
    await sendBlockchainServiceRequest(context, bcsRequest);
  }

  static async revokeIdentity(event: { body: IdentityDidRevokeDto }, context) {
    const claimerEmail = event.body.email;
    const identity = await new Identity({}, context).populateByUserEmail(
      context,
      claimerEmail,
    );

    if (!identity.exists() || identity.state != IdentityState.ATTESTED) {
      if (identity.state == IdentityState.SUBMITTED_REVOKE_REQ) {
        // If a user tries to revoke the identity
        // multiple times (while revocation in progress) like a
        // maniac, just return true every time without actually doing anything.
        return { success: true };
      }

      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.IDENTITY_DOES_NOT_EXIST,
        status: HttpStatus.NOT_FOUND,
      });
    }

    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    const identifier = Did.toChain(identity.didUri as DidUri);
    const endpointsCountForDid = await api.query.did.didEndpointsCount(
      identifier,
    );

    const depositReClaimExtrinsic = api.tx.did.reclaimDeposit(
      identifier,
      endpointsCountForDid,
    );

    try {
      const bcsRequest = await didRevokeRequestBc(
        context,
        depositReClaimExtrinsic,
        identity,
      );

      await identity.setState(IdentityState.SUBMITTED_REVOKE_REQ);

      // Call blockchain server and submit batch request
      await sendBlockchainServiceRequest(context, bcsRequest);
    } catch (error) {
      await new Lmas().writeLog({
        message: error,
        logType: LogType.ERROR,
        location: 'Authentication-API/identity/identity-revoke',
        service: ServiceName.AUTHENTICATION_API,
        data: { email: claimerEmail, didUri: identity.didUri },
      });
    }

    return { success: true };
  }
}
