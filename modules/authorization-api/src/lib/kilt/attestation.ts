import {
  //   Attestation,
  //   Blockchain,
  //   Claim,
  //   ConfigService,
  //   Credential,
  connect,
  //   CType,
  //   Did,
  //   ICType,
  KiltKeyringPair,
  //   ICredential,
  //   KeyringPair,
} from '@kiltprotocol/sdk-js';
import { env } from '@apillon/lib';
import // createAccount,
// createFullDid,
// generateKeypairs,
// getCtypeSchema,
'./utils';
import { Presentation } from '../../config/types';
import * as fs from 'fs';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { generateKeypairs } from './utils';

// function saveAssets(credentials: Array<Presentation>) {
//   const directory = `${process.cwd()}/claimer-credentials`;
//   fs.rmSync(directory, { recursive: true, force: true });
//   fs.mkdirSync(directory);
//   credentials.forEach((presentation: Presentation) => {
//     fs.writeFileSync(
//       `${directory}/presentation.json`,
//       JSON.stringify(presentation, null, 2),
//       'utf-8',
//     );
//   });
// }

// export default async function claimAttestationFlow(): Promise<any> {
//   // Separate all of these to claimer and attester mnemonic
//   await connect(network);
//   const api = ConfigService.get('api');
//   // CLAIMER
//   const claimerAcc = (await createAccount(claimerMnemonic)) as KiltKeyringPair;
//   const claimerAccKeypairs = generateKeypairs(claimerMnemonic);
//   const claimerFullDID = await createFullDid(claimerAcc, claimerMnemonic);

//   const claimerDidUri = claimerFullDID.uri;

// TODO: Attester gets populated from some secret environment (how do we get the secret????)

//   // CREATION
//   const authCType = getCtypeSchema();
//   try {
//     await CType.verifyStored(authCType);
//     console.log('Ctype is already stored on chain ...');
//   } catch (error) {
//     console.log('Creating ctype ...');
//     const api = ConfigService.get('api');
//     const extrinsic = api.tx.ctype.add(CType.toChain(authCType));

//     const tx = await Did.authorizeTx(
//       attesterDidUri,
//       extrinsic,
//       async ({ data }) => ({
//         signature: attesterAccKeypairs.assertion.sign(data),
//         keyType: attesterAccKeypairs.assertion.type,
//       }),
//       attesterAcc.address,
//     );

//     await Blockchain.signAndSubmitTx(tx, attesterAcc);
//   }

//   const authContents = {}; // TODO: Get correct format for Claim (Just use the existing Ctype and populate property relevant fields)
//   const authClaim = Claim.fromCTypeAndClaimContents(
//     authCType,
//     authContents,
//     claimerDidUri,
//   );

//   const authCredential = Credential.fromClaim(authClaim);
//   const authInteface = Attestation.fromCredentialAndDid(
//     authCredential,
//     attesterDidUri,
//   );

//   const auth = api.tx.attestation.add(
//     authInteface.claimHash,
//     authInteface.cTypeHash,
//     null,
//   );
//   const authTx = await Did.authorizeTx(
//     attesterDidUri,
//     auth,
//     async ({ data }) => ({
//       signature: attesterAccKeypairs.assertion.sign(data),
//       keyType: attesterAccKeypairs.assertion.type,
//     }),
//     attesterAcc.address,
//   );

//   console.log('Attester => create authorization attestation...');
//   await Blockchain.signAndSubmitTx(authTx, attesterAcc);
//   const emailAttested = Boolean(
//     await api.query.attestation.attestations(authCredential.rootHash),
//   );

//   console.log('Authentication data attested => ', emailAttested);

//   const presentation: ICredential = JSON.parse(JSON.stringify(authCredential));

//   const attestations = {
//     credential: {
//       ...presentation,
//       // Check the correctness of this
//       claimerSignature: {
//         // signature missing??
//         keyType: claimerFullDID.authentication,
//         keyUri: `${claimerDidUri}${claimerFullDID.authentication[0].id}`,
//       },
//     },
//   };

//   console.log(JSON.stringify(attestations));
//   // saveAssets(attestations)
// }
