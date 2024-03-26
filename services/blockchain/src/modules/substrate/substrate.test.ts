import {
  ChainType,
  SqlModelStatus,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import Keyring from '@polkadot/keyring';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Endpoint } from '../../common/models/endpoint';
import { Wallet } from '../wallet/wallet.model';
import { SubstrateService } from './substrate.service';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubsocialApi } from '@subsocial/api';
import { IpfsContent } from '@subsocial/types/substrate/classes';
import { Transaction } from '../../common/models/transaction';
import { DbTables } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';
import { getConfig } from '@apillon/tests-lib';

describe.only('Substrate service unit test', () => {
  let stage: Stage;
  let config: any;

  beforeAll(async () => {
    stage = await setupTest();
    config = await getConfig();

    // create kilt wallet
    await new Wallet(
      {
        ...config.kilt.wallet,
        chain: config.kilt.chain,
        chainType: config.kilt.chainType,
      },
      stage.context,
    ).insert();

    // create kilt endpoint
    await new Endpoint(
      {
        ...config.kilt.endpoint,
        chain: config.kilt.chain,
        chainType: config.kilt.chainType,
        status: 5,
      },
      stage.context,
    ).insert();

    // create crust endpoint
    await new Endpoint(
      {
        ...config.crust.endpoint,
        chain: config.crust.chain,
        chainType: config.crust.chainType,
        status: 5,
      },
      stage.context,
    ).insert();

    // await generateSubstrateWallets(1, SubstrateChain.CRUST, stage.context);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test substrate service - crust', async () => {
    const provider = new WsProvider(config.crust.endpoint.url);
    const api = await ApiPromise.create({
      provider,
      typesBundle: typesBundleForPolkadot,
      throwOnConnect: true,
    });

    let nonce, tx;
    try {
      nonce = await api.rpc.system.accountNextIndex(
        config.crust.wallet.address,
      );
      tx = await api.tx.market.placeStorageOrder(
        'QmUQ6i2Njyktbtvb5vxnzynD9fTrAvYN1qYbSKjudCv8mB', // random CID
        7390,
        0,
        '',
      );
      // const balance = await api.query.system.account(
      //   config.crust.wallet.address,
      // );
    } finally {
      await api.disconnect();
    }

    await new Wallet(
      {
        ...config.crust.wallet,
        chain: config.crust.chain,
        chainType: config.crust.chainType,
        nextNonce: nonce.toNumber(),
      },
      stage.context,
    ).insert();

    const serialize = tx.toHex();

    const res = await SubstrateService.createTransaction(
      { params: { transaction: serialize, chain: SubstrateChain.CRUST } },
      stage.context,
    );
    expect(res.transactionHash).toBeDefined();
    expect(res.transactionStatus).toBe(TransactionStatus.PENDING);

    const transaction = await SubstrateService.getTransactionById(
      { id: res.id },
      stage.context,
    );

    expect(transaction.transactionHash).toEqual(res.transactionHash);

    let submitted = false;
    await SubstrateService.transmitTransactions(
      { chain: SubstrateChain.CRUST },
      stage.context,
      async (data) => {
        if (data.logType == 'COST') {
          submitted = true;
        }
        expect(data.logType).not.toEqual('ERROR');

        return;
      },
    );
    expect(submitted).toBeTruthy();
  });

  test('Should fail sending a tx if balance below minTxBalance threshold', async () => {
    const { 0: kiltWallet } = await stage.context.mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.WALLET}\`
      WHERE chain = ${SubstrateChain.KILT}
      AND minTxBalance IS NOT NULL
      AND status = ${SqlModelStatus.ACTIVE}
      LIMIT 1
      `,
    );
    // At least 2 KILT is required for creating a DID
    expect(kiltWallet.minTxBalance?.toString()).toBe('2000000000000000');

    // Mock creating a transaction which should fail
    await expect(async () => {
      await SubstrateService.createTransaction(
        {
          params: {
            transaction: '0x',
            chain: SubstrateChain.KILT,
          },
        },
        stage.context,
      );
    }).rejects.toThrow(BlockchainCodeException);
  });

  describe.only('Test create and transmit subsocial transactions', () => {
    let nonce, transaction, wallet, api: SubsocialApi;

    beforeAll(async () => {
      const subsocialConfig = {
        ...config.subsocial.config,
      };
      api = await SubsocialApi.create(subsocialConfig);
      const substrateApi = await api.substrateApi;

      await new Endpoint(
        {
          ...config.subsocial.endpoint,
          chain: config.subsocial.chain,
          chainType: config.subsocial.chainType,
          status: 5,
        },
        stage.context,
      ).insert();

      nonce = await substrateApi.rpc.system.accountNextIndex(
        config.subsocial.wallet.address,
      );

      console.info(nonce.toNumber());

      console.info(substrateApi.rpc.system.chain);
      const account = await substrateApi.query.system.account(
        config.subsocial.wallet.address,
      );
      console.info(account.data.free.toString());
      wallet = await new Wallet(
        {
          ...config.subsocial.wallet,
          chain: config.subsocial.chain,
          chainType: config.subsocial.chainType,
          nextNonce: nonce.toNumber(),
        },
        stage.context,
      ).insert();
    });

    afterAll(async () => {
      (await api.substrateApi).disconnect();
    });

    test('Test create substrate subsocial transaction (space)', async () => {
      const spaceIpfsData = {
        about: 'My Test space created on ' + new Date().toString(),
        image: null, // ipfsImageCid = await api.subsocial.ipfs.saveFile(file)
        name: 'Test space',
        tags: [],
        email: null,
        links: [],
      };

      const cid = await api.ipfs.saveContentToOffchain(spaceIpfsData);

      const substrateApi = await api.substrateApi;
      const tx = substrateApi.tx.spaces.createSpace(IpfsContent(cid), null);

      const serialize = tx.toHex();

      const res = await SubstrateService.createTransaction(
        { params: { transaction: serialize, chain: SubstrateChain.SUBSOCIAL } },
        stage.context,
      );
      console.log('res: ', res);

      transaction = await new Transaction({}, stage.context).populateById(
        res.id,
      );
      expect(transaction.exists()).toBeTruthy();

      console.log('transaction: ', transaction);
    });

    test('Test transmit substrate subsocial transaction (space)', async () => {
      expect(transaction).toBeTruthy();

      await SubstrateService.transmitTransactions(
        { chain: SubstrateChain.SUBSOCIAL },
        stage.context,
        async (data) => {
          expect(data.logType).not.toEqual('ERROR');
          return;
        },
      );

      const updatedSubsocialWallet = await new Wallet(
        {},
        stage.context,
      ).populateById(wallet.id);
      expect(updatedSubsocialWallet.lastProcessedNonce).toEqual(
        transaction.nonce,
      );
    });
    test('Test create substrate subsocial transaction (post)', async () => {
      /*const authHeader =
        'c3ViLTVGQTluUURWZzI2N0RFZDhtMVp5cFhMQm52TjdTRnhZd1Y3bmRxU1lHaU45VFRwdToweDEwMmQ3ZmJhYWQwZGUwNzFjNDFmM2NjYzQzYmQ0NzIxNzFkZGFiYWM0MzEzZTc5YTY3ZWExOWM0OWFlNjgyZjY0YWUxMmRlY2YyNzhjNTEwZGY4YzZjZTZhYzdlZTEwNzY2N2YzYTBjZjM5OGUxN2VhMzAyMmRkNmEyYjc1OTBi';
      api.ipfs.setWriteHeaders({
        authorization: 'Basic ' + authHeader,
      });*/

      const postIpfsData = {
        title: 'Test post',
        //image: 'QmcWWpR176oFao49jrLHUoH3R9MCziE5d77fdD8qdoiinx',
        tags: [],
        body:
          'Test create subsocial post. Current date: ' + new Date().toString(),
      };

      //const cid = await api.ipfs.saveContent(postIpfsData);
      const cid = await api.ipfs.saveContentToOffchain(postIpfsData);

      const substrateApi = await api.substrateApi;

      const tx = substrateApi.tx.posts.createPost(
        12648,
        { RegularPost: null },
        IpfsContent(cid),
      );

      const serialize = tx.toHex();

      const res = await SubstrateService.createTransaction(
        { params: { transaction: serialize, chain: SubstrateChain.SUBSOCIAL } },
        stage.context,
      );
      console.log('res: ', res);

      transaction = await new Transaction({}, stage.context).populateById(
        res.id,
      );
      expect(transaction.exists()).toBeTruthy();

      console.log('transaction: ', transaction);
    });

    test('Test transmit substrate subsocial transaction (post)', async () => {
      expect(transaction).toBeTruthy();

      await SubstrateService.transmitTransactions(
        { chain: SubstrateChain.SUBSOCIAL },
        stage.context,
        async (data) => {
          expect(data.logType).not.toEqual('ERROR');
          return;
        },
      );

      const updatedSubsocialWallet = await new Wallet(
        {},
        stage.context,
      ).populateById(wallet.id);
      expect(updatedSubsocialWallet.lastProcessedNonce).toEqual(
        transaction.nonce,
      );
    });
  });
});
