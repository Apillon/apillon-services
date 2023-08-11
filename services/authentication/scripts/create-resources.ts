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
  Credential,
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
  getFullDidDocument,
  toCredentialIRI,
} from '../src/lib/kilt';
import { sendBlockchainServiceRequest } from '../src/lib/utils/blockchain-utils';
import { didRevokeRequestBc } from '../src/lib/utils/transaction-utils';

async function generateWellKnownDid() {
  const network = 'wss://spiritnet.kilt.io/parachain-public-ws';
  await connect(network);
  const api = ConfigService.get('api');
  // Which domain you want to attest
  const origin = 'https://oauth-staging.apillon.io';
  const mnemonic =
    'steak sunset sorry marriage consider better call cradle fall hidden torch dice'; // generateMnemonic();
  let wellKnownDidconfig;

  const {
    authentication,
    keyAgreement,
    assertionMethod,
    capabilityDelegation,
  } = await generateKeypairs(mnemonic);

  // generate account
  const account = generateAccount(mnemonic) as KiltKeyringPair;

  console.log('Encryption pub key: ', u8aToHex(keyAgreement.publicKey));
  console.log('Mnemonic: ', mnemonic);
  console.log('account.address', account.address);

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
        (await api.query.system.account(account.address)).data.free.toString(),
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(`Balance: ${balance}`);
    }
  }

  await createCompleteFullDid(
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

  // The new information is fetched from the blockchain and returned.
  const fullDid = Did.getFullDidUriFromKey(authentication);
  const encodedUpdatedDidDetails = await api.call.did.query(
    Did.toChain(fullDid),
  );
  const document = Did.linkedInfoFromChain(encodedUpdatedDidDetails).document;

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

  const credentialSubject = {
    id: didUri,
    origin: origin,
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

  console.log({
    account: account.address,
    didUri: document.uri,
    didConfiguration: JSON.stringify({
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
    }),
    mnemonic: mnemonic,
    encryptionPubKey: u8aToHex(keyAgreement.publicKey),
  });
}

console.log(
  'NOTE: This is a dev script! It is so ugly not even my grandma likes it.',
);
const wellKnownDidconfig = generateWellKnownDid();

console.log(Promise.resolve(wellKnownDidconfig));
