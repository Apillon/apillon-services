export const KILT_NETWORK = 'wss://peregrine.kilt.io/parachain-public-ws';
export const APILLON_ACC_ENCRYPT_KEY =
  '0x45a622b90d34e9298d355549b2895b021f78140a587daaa0019174c5bda87710';
export const APILLON_ACC_ADDRESS =
  '4rbTHfvkLsU3tyb4ysyNSNcJeRzc1ZNZLEnhAN9W26TsdMw6';
export const ECLIPTIC_DERIV_ALGORITHM = 'sr25519';

export const CREATE_IDENTITY_MOCK = {
  mnemonic:
    'radar laundry matter way sweet arrive hundred behind tribe phrase cave rely',
  mnemonic_control:
    'dune stomach month decline dance weird all fatal couch sleep thunder bread',
  did_uri: 'did:kilt:4stciB2y3ZXMDsYxwEDi1U8KnKywaRftsBj5y5dFTvy8ScNC',
  email: 'luka.golinar@kalmia.si',
  did_create_op_data: {
    encoded_data:
      '0xdc1204ee2b2e274bc74b744264ec67b9a13a4366bf8118bb217cac90f634e524a2bee528b67f4a1500c5223b1c52bc6950ea9397f3baebe6dd2e26b5940804240400e101a638d8b54a788bf7128b099cd184868aa2231e29c400b4ab4f7926748138000004000000',
    encoded_signature:
      '0x6a71ca26685a311e773e85d9c022ef265e63dc5a6f7b8cd86cc36f5f2d86a7743e9d0caba8cb8ca953a4e50def61ad49b125150ab742c1300cd4b45fef90ed80 ',
  },
  verification_token: null,
  credential: {
    claim: {
      owner: 'did:kilt:4stciB2y3ZXMDsYxwEDi1U8KnKywaRftsBj5y5dFTvy8ScNC',
      contents: { Email: 'luka.golinar@kalmia.si' },
      cTypeHash:
        '0x3291bb126e33b4862d421bfaa1d2f272e6cdfc4f96658988fbcffea8914bd9ac',
    },
    rootHash:
      '0x2828406aa295470ceadb4382eeab53489b78e90d1ae8eb69744cf9e40eb7bec8',
    claimHashes: [
      '0x1ca716d166d5b6cc062e9cb271bb6ac177cc9a46478c11d8a0c264676d897499',
      '0x2a921da935da2c4b1e8294ddde77c07ae2a089dab097a193f281760e0bf00d35',
    ],
    delegationId: null,
    claimNonceMap: {
      '0x16ff92391ce43dc0e1c1e9184b38310c258d2e95354a9e8d4a46ce1198cbf18f':
        '64215129-ff95-48e0-a361-920210c4cd89',
      '0x36a6f446e45673f4468e114f4f2870aa6c557642d75def45c81fcc506299b361':
        'e47cc649-d3f3-4912-bafb-61abd77b9166',
    },
    legitimations: [],
    claimerSignature: {
      keyUri: 'did:kilt:4stciB2y3ZXMDsYxwEDi1U8KnKywaRftsBj5y5dFTvy8ScNC',
      keyType: 'sr25519',
    },
  },
};
