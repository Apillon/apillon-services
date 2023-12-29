import { ChainType, SubstrateChain } from '@apillon/lib';
import Keyring from '@polkadot/keyring';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Endpoint } from '../../common/models/endpoint';
import { Wallet } from '../wallet/wallet.model';
import { SubstrateService } from './substrate.service';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubsocialApi } from '@subsocial/api';
import { IpfsContent } from '@subsocial/types/substrate/classes';
import { convertToBalanceWithDecimal } from '@subsocial/utils';
import { Transaction } from '../../common/models/transaction';

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
      throwOnConnect: true,
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

  describe.only('Test create and transmit subsocial transaction', () => {
    let nonce, transaction, wallet;

    /*test('Test create energy transaction', async () => {
      await new Endpoint(
        {
          url: 'wss://xsocial.subsocial.network',
          chain: SubstrateChain.XSOCIAL,
          chainType: ChainType.SUBSTRATE,
          status: 5,
        },
        stage.context,
      ).insert();

      const config = {
        substrateNodeUrl: 'wss://xsocial.subsocial.network',
        ipfsNodeUrl: 'https://gw.crustfiles.app',
      };
      const api: SubsocialApi = await SubsocialApi.create(config);

      const substrateApi = await api.substrateApi;

      const burnAmount = 1; // 1 SUB

      const parsedBurnAmount = convertToBalanceWithDecimal(burnAmount, 10); // SUB token uses 10 decimals, SOON (testnet) uses 12 decimals
      console.info(parsedBurnAmount.toString());

      // or you can just multiply it manually
      // const parsedBurnAmount = burnAmount * 10 ** 10

      const target = '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6'; // change it to target account
      const tx = substrateApi.tx.energy.generateEnergy(target, 1);

      nonce = await substrateApi.rpc.system.accountNextIndex(
        '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
      );

      console.info(substrateApi.rpc.system.chain);
      const account = await substrateApi.query.system.account(
        '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
      );
      console.info(account.data.free.toString());
      wallet = await new Wallet(
        {
          chain: SubstrateChain.XSOCIAL,
          chainType: ChainType.SUBSTRATE,
          seed: 'disorder reveal crumble deer axis slush unique answer catalog junk hazard damp',
          address: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
          nextNonce: nonce.toNumber(),
        },
        stage.context,
      ).insert();

      const serialize = tx.toHex();

      const res = await SubstrateService.createTransaction(
        { params: { transaction: serialize, chain: SubstrateChain.XSOCIAL } },
        stage.context,
      );
      console.log('res: ', res);

      transaction = await SubstrateService.getTransactionById(
        { id: res.id },
        stage.context,
      );

      console.log('transaction: ', transaction);

      // const res2 = await SubstrateService.transmitTransactions(
      //   { chain: SubstrateChain.CRUST },
      //   stage.context,
      // );
      // console.log('res2: ', res2);
    });*/

    test('Test create substrate xsocial transaction', async () => {
      await new Endpoint(
        {
          url: 'wss://xsocial.subsocial.network',
          chain: SubstrateChain.XSOCIAL,
          chainType: ChainType.SUBSTRATE,
          status: 5,
        },
        stage.context,
      ).insert();

      const config = {
        substrateNodeUrl: 'wss://xsocial.subsocial.network',
        ipfsNodeUrl: 'https://gw.crustfiles.app',
      };
      const api: SubsocialApi = await SubsocialApi.create(config);

      const authHeader =
        'c3ViLTVGQTluUURWZzI2N0RFZDhtMVp5cFhMQm52TjdTRnhZd1Y3bmRxU1lHaU45VFRwdToweDEwMmQ3ZmJhYWQwZGUwNzFjNDFmM2NjYzQzYmQ0NzIxNzFkZGFiYWM0MzEzZTc5YTY3ZWExOWM0OWFlNjgyZjY0YWUxMmRlY2YyNzhjNTEwZGY4YzZjZTZhYzdlZTEwNzY2N2YzYTBjZjM5OGUxN2VhMzAyMmRkNmEyYjc1OTBi';
      api.ipfs.setWriteHeaders({
        authorization: 'Basic ' + authHeader,
      });

      const spaceIpfsData = {
        about: 'My 3 Test space',
        image: 'Qmasp4JHhQWPkEpXLHFhMAQieAH1wtfVRNHWZ5snhfFeBe', // ipfsImageCid = await api.subsocial.ipfs.saveFile(file)
        name: 'Test 3',
        tags: ['Apillon'],
      };

      const cid = await api.ipfs.saveContent(spaceIpfsData);

      const substrateApi = await api.substrateApi;

      const tx = substrateApi.tx.spaces.createSpace(IpfsContent(cid), null);

      nonce = await substrateApi.rpc.system.accountNextIndex(
        '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
      );

      console.info(substrateApi.rpc.system.chain);
      const account = await substrateApi.query.system.account(
        '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
      );
      console.info(account.data.free.toString());
      wallet = await new Wallet(
        {
          chain: SubstrateChain.XSOCIAL,
          chainType: ChainType.SUBSTRATE,
          seed: 'disorder reveal crumble deer axis slush unique answer catalog junk hazard damp',
          address: '3prwzdu9UPS1vEhReXwGVLfo8qhjLm9qCR2D2FJCCde3UTm6',
          nextNonce: nonce.toNumber(),
        },
        stage.context,
      ).insert();

      const serialize = tx.toHex();

      const res = await SubstrateService.createTransaction(
        { params: { transaction: serialize, chain: SubstrateChain.XSOCIAL } },
        stage.context,
      );
      console.log('res: ', res);

      transaction = await new Transaction({}, stage.context).populateById(
        res.id,
      );
      expect(transaction.exists()).toBeTruthy();

      console.log('transaction: ', transaction);

      // const res2 = await SubstrateService.transmitTransactions(
      //   { chain: SubstrateChain.CRUST },
      //   stage.context,
      // );
      // console.log('res2: ', res2);
    });

    test('Test transmit substrate xSocial transaction', async () => {
      expect(transaction).toBeTruthy();

      await SubstrateService.transmitTransactions(
        { chain: SubstrateChain.XSOCIAL },
        stage.context,
        async () => {
          return;
        },
      );

      const updatedXSocialWallet = await new Wallet(
        {},
        stage.context,
      ).populateById(wallet.id);
      expect(updatedXSocialWallet.lastProcessedNonce).toEqual(
        transaction.nonce,
      );
    });
  });
});
