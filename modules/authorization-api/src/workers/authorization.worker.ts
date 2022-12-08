import { Context, env, LogType, writeLog } from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import {
  connect,
  ConfigService,
  KiltKeyringPair,
  Utils,
  Blockchain,
  Did,
} from '@kiltprotocol/sdk-js';
import {
  generateAccount,
  generateKeypairs,
  getFullDidDocument,
  getNextNonce,
  prepareAttestation,
} from '../lib/kilt/utils';

import { u8aToHex, hexToU8a } from '@polkadot/util';
import { BN } from '@polkadot/util/bn/bn';

export class AuthroizationWorker extends BaseQueueWorker {
  // TODO: Handle errors and edge cases properly
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(
      workerDefinition,
      context,
      type,
      env.AUTHORIZATION_AWS_WORKER_SQS_URL,
    );
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(data: any): Promise<any> {
    // Input parametersa
    const did_create_op = data.did_create_op;
    const claimerEmail = data.email;
    const claimerDidUri = data.didUri;

    // Generate (retrieve) attester did data
    const attesterKeyPairs = await generateKeypairs(env.KILT_ATTESTER_MNEMONIC);
    const attesterAccount = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;
    // DID
    const attesterDidDoc = await getFullDidDocument(attesterKeyPairs);
    const attesterDidUri = attesterDidDoc.uri;

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
      u8aToHex(attesterKeyPairs.encryption.secretKey),
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
            keyUri: claimerDidUri,
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

    return null;
  }
}
