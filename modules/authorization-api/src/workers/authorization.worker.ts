import { HttpStatus } from '@nestjs/common';
import { u8aToHex, hexToU8a } from '@polkadot/util';
import { BN } from '@polkadot/util/bn/bn';
import {
  connect,
  ConfigService,
  KiltKeyringPair,
  Utils,
  Blockchain,
  Did,
} from '@kiltprotocol/sdk-js';
import {
  CodeException,
  env,
  LogType,
  SerializeFor,
  writeLog,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  generateAccount,
  generateKeypairs,
  getFullDidDocument,
  getNextNonce,
  createAttestationRequest,
} from '../lib/kilt';
import { AuthorizationApiContext } from '../context';
import { Attestation } from '../modules/attestation/models/attestation.model';
import { AttestationState, AuthorizationErrorCode } from '../config/types';

export class AuthorizationWorker extends BaseQueueWorker {
  context: AuthorizationApiContext;

  // TODO: Handle errors and edge cases properly
  public constructor(
    workerDefinition: WorkerDefinition,
    context: AuthorizationApiContext,
    type: QueueWorkerType,
  ) {
    super(
      workerDefinition,
      context,
      type,
      env.AUTHORIZATION_AWS_WORKER_SQS_URL,
    );

    this.context = context;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(parameters: any): Promise<any> {
    // Input parameters
    const did_create_op = parameters.did_create_op;
    const claimerEmail = parameters.email;
    const claimerDidUri = parameters.didUri;

    // Generate (retrieve) attester did data
    const attesterKeypairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    // DID
    const attesterDidDoc = await getFullDidDocument(attesterKeypairs);
    const attesterDidUri = attesterDidDoc.uri;

    // Check if correct attestation + state exists -> IN_PROGRESS
    const attestationDb = await new Attestation(
      {},
      this.context,
    ).populateByUserEmail(this.context, claimerEmail);

    if (
      !attestationDb.exists() ||
      attestationDb.state != AttestationState.IN_PROGRESS
    ) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthorizationErrorCode.ATTEST_INVALID_STATE,
        errorCodes: AuthorizationErrorCode,
      });
    }

    // Init Kilt essentials
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    // Decrypt incoming payload -> DID creation TX generated on FE
    const decrypted = Utils.Crypto.decryptAsymmetricAsStr(
      {
        box: hexToU8a(did_create_op.payload.message),
        nonce: hexToU8a(did_create_op.payload.nonce),
      },
      did_create_op.senderPubKey,
      u8aToHex(attesterKeypairs.encryption.secretKey),
    );

    if (decrypted !== false) {
      const payload = JSON.parse(decrypted);
      const data = hexToU8a(payload.data);
      const signature = hexToU8a(payload.signature);

      // Create DID create type and submit tx to Kilt BC
      try {
        const fullDidCreationTx = api.tx.did.create(data, {
          sr25519: signature,
        });
        console.log('Submitting DID create TX ...');

        await Blockchain.signAndSubmitTx(fullDidCreationTx, attesterAccount);
      } catch (error) {
        // TODO: Handle
      }
    } else {
      // TODO: Handle
      throw 'Decryption failed ...';
    }

    // Prepare attestation instance and credential structure
    const { attestationInstance, credential } = createAttestationRequest(
      claimerEmail,
      attesterDidUri,
      claimerDidUri,
    );

    const attestation = api.tx.attestation.add(
      attestationInstance.claimHash,
      attestationInstance.cTypeHash,
      null,
    );

    const nextNonceBN = new BN(await getNextNonce(attesterDidUri));
    // Prepare claim TX
    const emailClaimTx = await Did.authorizeTx(
      attesterDidUri,
      attestation,
      async ({ data }) => ({
        signature: attesterKeypairs.assertion.sign(data),
        keyType: attesterKeypairs.assertion.type,
      }),
      attesterAccount.address,
      { txCounter: nextNonceBN },
    );

    try {
      console.log('Submitting attestation create TX ...');
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

      const claimerCredential = {
        ...credential,
        claimerSignature: {
          keyType: 'sr25519',
          keyUri: claimerDidUri,
        },
      };

      attestationDb.populate({
        state: AttestationState.ATTESTED,
        credential: claimerCredential,
      });

      const conn = await this.context.mysql.start();
      try {
        await attestationDb.insert(SerializeFor.INSERT_DB, conn);
        await this.context.mysql.commit(conn);
      } catch (err) {
        await this.context.mysql.rollback(conn);
        writeLog(
          LogType.ERROR,
          `Error creating attestation state for user with email ${claimerEmail}'`,
          'attestation.service.ts',
          'sendVerificationEmail',
        );
        throw err;
      }

      return true;
    } catch (error) {
      writeLog(
        LogType.MSG,
        `ATTESTATION ${claimerEmail} attested => FAILED`,
        'attestation.service.ts',
        'createAttestation',
      );
    }

    return false;
  }
}
