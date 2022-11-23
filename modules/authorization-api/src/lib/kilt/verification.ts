// import {
//   ConfigService,
//   connect,
//   Credential,
//   Did,
//   Attestation,
//   ICredential,
//   SignCallback,
//   ICredentialPresentation,
// } from '@kiltprotocol/sdk-js';
// import type { ApiPromise } from '@polkadot/api';
// import { generateKeypairs, getChallenge } from './utils';

// const network = '';
// const claimerMnemonic = '';

// async function verifyPresentation(
//   api: ApiPromise,
//   presentation: ICredentialPresentation,
//   challenge: string,
// ): Promise<boolean> {
//   try {
//     await Credential.verifyPresentation(presentation, { challenge });
//     const attestationInfo = Attestation.fromChain(
//       await api.query.attestation.attestations(presentation.rootHash),
//       presentation.rootHash,
//     );
//     !attestationInfo.revoked ? console.log('Awww yeah mfs') : null;
//     return !attestationInfo.revoked;
//   } catch (error) {
//     console.log(error);
//     return false;
//   }
// }

// export async function createPresentation(
//   credential: ICredential,
//   signCallback: SignCallback,
//   challenge?: string,
// ): Promise<ICredentialPresentation> {
//   // Create the presentation from credential, DID and challenge
//   return Credential.createPresentation({
//     credential,
//     signCallback,
//     challenge,
//   });
// }

// export async function verificationFlow(
//   credential: ICredential,
//   signCallback: SignCallback,
// ) {
//   const api = ConfigService.get('api');
//   const challenge = getChallenge();

//   const presentation = await createPresentation(
//     credential,
//     signCallback,
//     challenge,
//   );

//   // The verifier checks the presentation.
//   const isValid = await verifyPresentation(api, presentation, challenge);
//   if (isValid) {
//     console.log('Verification successful! It is you 🎉');
//   } else {
//     console.log('Verification failed! 🚫');
//   }
// }

// export default async function credentialVerificationFlow(): Promise<any> {
//   await connect(network);
//   const api = ConfigService.get('api');

//   try {
//     const { authentication } = generateKeypairs(claimerMnemonic);
//     const claimerDid = Did.createLightDidDocument({
//       authentication: [authentication],
//     });

//     const credential = JSON.stringify({}); // TOOD: To be uploaded
//     const credentialJson = JSON.parse(credential);

//     await verificationFlow(credentialJson['credential'], async ({ data }) => ({
//       signature: authentication.sign(data, { withType: true }),
//       keyType: authentication.type,
//       keyUri: `${claimerDid.uri}${claimerDid.authentication[0].id}`,
//     }));
//   } catch (e) {
//     throw e;
//   }
// }
