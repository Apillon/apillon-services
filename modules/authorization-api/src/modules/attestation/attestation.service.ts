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
  ModuleValidatorErrorCode,
} from '../../config/types';
import {
  generateKeypairs,
  generateAccount,
  prepareAttestation,
  getFullDidDocument,
  getNextNonce,
} from '../../lib/kilt/utils';
import { KiltKeyringPair } from '@kiltprotocol/types';
import {
  Blockchain,
  ConfigService,
  connect,
  Did,
  Utils,
} from '@kiltprotocol/sdk-js';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { BN } from '@polkadot/util/bn/bn';

@Injectable()
export class AttestationService {
  async startUserAttestationProcess(
    context: AuthorizationApiContext,
    body: AttestationEmailDto,
  ): Promise<any> {
    const email = body.email;
    // TODO: How do we check for existing users
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
    attestation.populate({
      state: AttestationState.IN_PROGRESS,
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

    const token = generateJwtToken(JwtTokenType.ATTEST_EMAIL_VERIFICATION, {
      email,
    });

    const email_context = {
      verification_link: `http://${env.AUTH_API_HOST}:${env.AUTH_API_PORT}/attestation/verify/${token}`,
    };

    await new Mailing(context).sendCustomMail({
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
        status: HttpStatus.NOT_FOUND,
        code: ModuleValidatorErrorCode.ATTEST_DOES_NOT_EXIST,
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
        status: HttpStatus.NOT_FOUND,
        code: ModuleValidatorErrorCode.ATTEST_DOES_NOT_EXIST,
        errorCodes: ModuleValidatorErrorCode,
      });
    }

    return { state: attestation.state };
  }

  async generateIdentity(context: AuthorizationApiContext, body: any) {
    // Input parametersa
    const did_create_op = body.did_create_op;
    const claimerEmail = body.email;
    const claimerDidUri = body.didUri;

    // Init Kilt essentials
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    // Generate (retrieve) attester did data
    const attesterKeyPairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;
    // DID
    const attesterDidDoc = await getFullDidDocument(attesterKeyPairs);
    const attesterDidUri = attesterDidDoc.uri;

    console.log(
      'ATTESTER PUB KEY ',
      u8aToHex(attesterKeyPairs.encryption.publicKey),
    );

    // Decrypt incoming payload -> DID creation TX generated on FE
    const decrypted = Utils.Crypto.decryptAsymmetricAsStr(
      {
        box: hexToU8a(did_create_op.payload.message),
        nonce: hexToU8a(did_create_op.payload.nonce),
      },
      did_create_op.senderPubKey,
      u8aToHex(attesterKeyPairs.encryption.secretKey),
    );

    let success = false;
    if (decrypted !== false) {
      const payload = JSON.parse(decrypted);
      const data = hexToU8a(payload.data);
      const signature = hexToU8a(payload.signature);

      // Create DID create type and submit tx to Kilt BC
      try {
        const fullDidCreationTx = api.tx.did.create(data, {
          sr25519: signature,
        });
        console.log('Submitting did creation TX to BC...');
        await Blockchain.signAndSubmitTx(fullDidCreationTx, attesterAccount);
      } catch (error) {
        console.log('Error occured - ', error);
      }
    }

    // Prepare attestation object with claimer data
    const { attestObject, credential } = prepareAttestation(
      claimerEmail,
      attesterDidUri,
      claimerDidUri,
    );

    const emailClaim = api.tx.attestation.add(
      attestObject.claimHash,
      attestObject.cTypeHash,
      null,
    );

    // TODO: This does not work at the moment...
    const nextNonceBN = new BN(await getNextNonce(attesterDidUri));
    // Prepare claim tx
    const emailClaimTx = await Did.authorizeTx(
      attesterDidUri,
      emailClaim,
      async ({ data }) => ({
        signature: attesterKeyPairs.assertion.sign(data),
        keyType: attesterKeyPairs.assertion.type,
      }),
      attesterAccount.address,
      { txCounter: nextNonceBN },
    );

    try {
      console.log('Submitting attestation TX to BC...');
      await Blockchain.signAndSubmitTx(emailClaimTx, attesterAccount);
      const emailAttested = Boolean(
        await api.query.attestation.attestations(credential.rootHash),
      );

      writeLog(
        LogType.MSG,
        `ATTESTATION ${claimerEmail} attested => ${emailAttested}`,
        'attestation.service.ts',
        'createAttestation',
      );

      return {
        success: true,
        attested: emailAttested,
        credential: JSON.stringify({
          ...credential,
          claimerSignature: {
            keyType: 'sr25519',
            keyUri: body.didUri,
          },
        }),
      };
    } catch (error) {
      console.error(error);
      writeLog(
        LogType.MSG,
        `ATTESTATION ${claimerEmail} attested => FAILED`,
        'attestation.service.ts',
        'createAttestation',
      );
    }

    return { success: success };
  }

  async generateDIDDocumentDEV(context: AuthorizationApiContext, body: any) {
    if (
      env.APP_ENV != AppEnvironment.TEST &&
      env.APP_ENV != AppEnvironment.DEV &&
      env.APP_ENV != AppEnvironment.LOCAL_DEV
    ) {
      throw 'Invalid request!';
    }

    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    const { authentication, encryption, assertion, delegation } =
      await generateKeypairs(body.mnemonic);
    const didDoc = await Did.resolve(Did.getFullDidUriFromKey(authentication));
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

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
