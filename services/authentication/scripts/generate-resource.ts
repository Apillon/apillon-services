// export async generateDevResources(event: { body: any }, _context) {
//     // Used to issue did documents to test accounts -> Since the peregrine faucet
//     // only allows 100PILT token per account, we need a new one everytime funds
//     // are depleted ...
//     // NOTE: Use this function to generate a testnet DID
//     if (
//       env.APP_ENV != AppEnvironment.TEST &&
//       env.APP_ENV != AppEnvironment.LOCAL_DEV
//     ) {
//       throw 'Invalid request!';
//     }

//     await connect(env.KILT_NETWORK);
//     // await connect(env.KILT_NETWORK_TEST);
//     const api = ConfigService.get('api');
//     let wellKnownDidconfig;
//     let mnemonic;

//     // Generate mnemonic
//     if (event.body.mnemonic) {
//       mnemonic = event.body.mnemonic;
//     } else if (event.body.domain_linkage_only) {
//       mnemonic = env.KILT_ATTESTER_MNEMONIC;
//     } else {
//       mnemonic = generateMnemonic();
//     }

//     // generate keypairs
//     const {
//       authentication,
//       keyAgreement,
//       assertionMethod,
//       capabilityDelegation,
//     } = await generateKeypairs(mnemonic);

//     // generate account
//     const account = generateAccount(mnemonic) as KiltKeyringPair;

//     // First check if we have the required balance
//     let balance = parseInt(
//       (await api.query.system.account(account.address)).data.free.toString(),
//     );

//     if (balance < 3) {
//       console.log(`Requesting tokens for account ${account.address}`);

//       const reqTestTokens = `https://faucet-backend.peregrine.kilt.io/faucet/drop`;
//       await (async () => {
//         axios
//           .post(reqTestTokens, { address: account.address })
//           .then((resp: any) => {
//             console.log('Response ', resp.status);
//           })
//           .catch((error: any) => {
//             return {
//               error: `Error when requesting token from peregrine faucet: ${error}`,
//             };
//           });
//       })();

//       while (balance < 3) {
//         balance = parseInt(
//           (
//             await api.query.system.account(account.address)
//           ).data.free.toString(),
//         );
//         await new Promise((resolve) => setTimeout(resolve, 2000));
//         console.log(`Balance: ${balance}`);
//       }
//     }

//     const document = await createCompleteFullDid(
//       account,
//       {
//         authentication: authentication,
//         keyAgreement: keyAgreement,
//         assertionMethod: assertionMethod,
//         capabilityDelegation: capabilityDelegation,
//       },
//       (async ({ data }) => ({
//         signature: authentication.sign(data),
//         keyType: authentication.type,
//       })) as SignExtrinsicCallback,
//     );

//     if (event.body.domain_linkage) {
//       const domainLinkage = event.body.domain_linkage;
//       let origin = domainLinkage.origin;

//       if (!origin) {
//         return { error: 'domain_linkage: Origin must be provided!!' };
//       }

//       console.log(`Creating domain linkage for ${origin}`);
//       if (!validUrl.isUri(origin)) {
//         throw new Error('The origin is not a valid url');
//       }

//       const domainClaimContents = {
//         origin,
//       };

//       const claim = Claim.fromCTypeAndClaimContents(
//         getCtypeSchema(ApillonSupportedCTypes.DOMAIN_LINKAGE),
//         domainClaimContents,
//         document.uri,
//       );

//       const credential = Credential.fromClaim(claim);

//       const assertionKey = document.assertionMethod?.[0];

//       if (!assertionKey) {
//         throw new Error(
//           'Full DID doesnt have assertion key: Please add assertion key',
//         );
//       }

//       const domainLinkageCredential = await createPresentation(
//         credential,
//         await assertionSigner({
//           assertion: assertionMethod,
//           didDocument: document,
//         }),
//       );

//       const claimContents = domainLinkageCredential.claim.contents;
//       if (!domainLinkageCredential.claim.owner && !claimContents.origin) {
//         throw new Error('Claim do not content an owner or origin');
//       }

//       Did.validateUri(credential.claim.owner);
//       const didUri = credential.claim.owner;
//       if (typeof claimContents.origin !== 'string') {
//         throw new Error('claim contents id is not a string');
//       } else if (!validUrl.isUri(claimContents.origin)) {
//         throw new Error('The claim contents origin is not a valid url');
//       } else {
//         origin = claimContents.origin;
//       }

//       const credentialSubject = {
//         id: didUri,
//         origin: event.body.domain_linkage.origin,
//         rootHash: domainLinkageCredential.rootHash,
//       };

//       const issuanceDate = new Date().toISOString();
//       const { claimerSignature, rootHash } = domainLinkageCredential;
//       // const id = toCredentialIRI(credential.rootHash);

//       await Did.verifyDidSignature({
//         expectedVerificationMethod: 'assertionMethod',
//         signature: hexToU8a(claimerSignature.signature),
//         keyUri: claimerSignature.keyUri,
//         message: Utils.Crypto.coToUInt8(rootHash),
//       });

//       // add self-signed proof
//       const proof: ApillonSelfSignedProof = {
//         type: APILLON_SELF_SIGNED_PROOF_TYPE,
//         proofPurpose: 'assertionMethod',
//         verificationMethod: claimerSignature.keyUri,
//         signature: claimerSignature.signature,
//         challenge: claimerSignature.challenge,
//       };

//       wellKnownDidconfig = {
//         '@context':
//           'https://identity.foundation/.well-known/did-configuration/v1',
//         linked_dids: [
//           {
//             '@context': [
//               'https://www.w3.org/2018/credentials/v1',
//               'https://identity.foundation/.well-known/did-configuration/v1',
//             ],
//             issuer: didUri,
//             issuanceDate,
//             type: [
//               DEFAULT_VERIFIABLECREDENTIAL_TYPE,
//               'DomainLinkageCredential',
//               APILLON_VERIFIABLECREDENTIAL_TYPE,
//             ],
//             credentialSubject,
//             proof,
//           },
//         ],
//       };
//     }

//     return {
//       account: account.address,
//       didUri: document.uri,
//       didConfiguration: wellKnownDidconfig,
//       mnemonic: mnemonic,
//       encryptionPubKey: u8aToHex(keyAgreement.publicKey),
//     };
//   }
