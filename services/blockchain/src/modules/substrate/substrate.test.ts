import { ChainType, SubstrateChain } from '@apillon/lib';
import Keyring from '@polkadot/keyring';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Endpoint } from '../../common/models/endpoint';
import { Wallet } from '../wallet/wallet.model';
import { SubstrateService } from './substrate.service';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { ApiPromise, WsProvider } from '@polkadot/api';

describe('Substrate service unit test', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
    // await generateSubstrateWallets(1, SubstrateChain.CRUST, stage.context);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test service', async () => {
    const keyring = new Keyring({ ss58Format: 38, type: 'sr25519' });
    const keypair = keyring.createFromUri(
      'fine circle fiction good shop hand canal approve over canal border mixed',
    );

    console.log(keypair.address);
    const endpoint = await new Endpoint(
      {
        url: 'wss://rpc-rocky.crust.network',
        chain: SubstrateChain.CRUST,
        chainType: ChainType.SUBSTRATE,
        status: 5,
      },
      stage.context,
    ).insert();
    await new Endpoint(
      {
        url: 'wss://spiritnet.api.onfinality.io/ws?apikey=15a3df59-0a99-4216-97b4-e2d242fe64e5',
        chain: SubstrateChain.KILT,
        chainType: ChainType.SUBSTRATE,
        status: 5,
      },
      stage.context,
    ).insert();

    const provider = new WsProvider(endpoint.url);
    const api = await ApiPromise.create({
      provider,
      typesBundle: typesBundleForPolkadot,
    });

    let nonce, tx;
    try {
      nonce = await api.rpc.system.accountNextIndex(
        '5DjjQpgetdaYUN6YyDGNguM1oMMDnNHnVPwgZDWuc29LswBi',
      );
      console.log('NONCE: ', nonce);
      tx = await api.tx.market.placeStorageOrder(
        'QmUQ6i2Njyktbtvb5vxnzynD9fTrAvYN1qYbSKjudCv8mB',
        7390,
        0,
        '',
      );
    } finally {
      await api.disconnect();
    }

    await new Wallet(
      {
        chain: SubstrateChain.KILT,
        chainType: ChainType.SUBSTRATE,
        seed: 'fine circle fiction good shop hand canal approve over canal border mixed',
        address: '4q4EMLcCRKF1VgXgJgtcVu4CeVvwa6tsmBDQUKgNH9YUZRKq',
      },
      stage.context,
    ).insert();

    await new Wallet(
      {
        chain: SubstrateChain.CRUST,
        chainType: ChainType.SUBSTRATE,
        seed: 'fine circle fiction good shop hand canal approve over canal border mixed',
        address: '5DjjQpgetdaYUN6YyDGNguM1oMMDnNHnVPwgZDWuc29LswBi',
        nextNonce: nonce.toNumber(),
      },
      stage.context,
    ).insert();

    const serialize = tx.toHex();

    const res = await SubstrateService.createTransaction(
      { params: { transaction: serialize, chain: SubstrateChain.CRUST } },
      stage.context,
    );
    console.log('res: ', res);

    const transaction = await SubstrateService.getTransactionById(
      { id: res.id },
      stage.context,
    );

    console.log('transaction: ', transaction);

    // const res2 = await SubstrateService.transmitTransactions(
    //   { chain: SubstrateChain.CRUST },
    //   stage.context,
    // );
    // console.log('res2: ', res2);
  });
});
