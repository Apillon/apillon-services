import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  connect,
  ConfigService,
  KiltKeyringPair,
  Did,
  DidUri,
  SignExtrinsicCallback,
  Claim,
  Utils,
} from '@kiltprotocol/sdk-js';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import axios from 'axios';
import {
  ApillonSupportedCTypes,
  ApillonSelfSignedProof,
  APILLON_SELF_SIGNED_PROOF_TYPE,
  DEFAULT_VERIFIABLECREDENTIAL_TYPE,
  APILLON_VERIFIABLECREDENTIAL_TYPE,
} from '../src/config/types';
import {
  generateMnemonic,
  generateKeypairs,
  generateAccount,
  createCompleteFullDid,
  getCtypeSchema,
  createPresentation,
  assertionSigner,
} from '../src/lib/kilt';
import { sendBlockchainServiceRequest } from '../src/lib/utils/blockchain-utils';
import { didRevokeRequestBc } from '../src/lib/utils/transaction-utils';

async function generateDevResources() {
  console.log('Network: ', env.KILT_NETWORK);
  await connect(env.KILT_NETWORK);
  const api = ConfigService.get('api');
  let wellKnownDidconfig;
  // This is the attesterAcc, used elsewhere in the code
  let mnemonic = process.argv[2];
  // Generate mnemonic
  if (!mnemonic) {
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

  console.log('Encryption public key: ', u8aToHex(keyAgreement.publicKey));
  console.log('Address: ', account.address);

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
  }

  while (balance < 3) {
    balance = parseInt(
      (await api.query.system.account(account.address)).data.free.toString(),
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log(`Balance: ${balance}`);
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
}

generateDevResources();
