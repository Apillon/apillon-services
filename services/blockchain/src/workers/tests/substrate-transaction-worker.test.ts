import { mnemonicGenerate } from '@polkadot/util-crypto';
import {
  ChainType,
  env,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Transaction } from '../../common/models/transaction';
import { Wallet } from '../../modules/wallet/wallet.model';
import { SubstrateTransactionWorker } from '../substrate-transaction-worker';
import { WorkerName } from '../worker-executor';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubstrateService } from '../../modules/substrate/substrate.service';
import { Endpoint } from '../../common/models/endpoint';
import { Keyring } from '@polkadot/keyring';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import HttpRequestMock from 'http-request-mock';
import { KeyringPair } from '@polkadot/keyring/types';
import { getConfig } from '@apillon/tests-lib';

const CHAIN_TYPE = ChainType.SUBSTRATE;

describe('Substrate tests', () => {
  let stage: Stage;
  beforeAll(async () => {
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Kilt tests', () => {
    let wallet: Wallet;
    const startBlock = 3982289;

    beforeAll(async () => {
      env.BLOCKCHAIN_KILT_GRAPHQL_SERVER = 'http://3.251.2.33:8082/graphql';
      const chain = SubstrateChain.KILT;

      wallet = await new Wallet(
        {
          chain,
          chainType: CHAIN_TYPE,
          address: '4qb612mWyrA2Ga2WhXRgYE7tqo8rGs6f6UBZciqcJvfYUGTp',
          // This is actually not correct - the seed should match the address
          seed: mnemonicGenerate(),
          lastParsedBlock: startBlock,
        },
        stage.context,
      ).insert();
    });

    test('Single wallet transactions', async () => {
      const address = '4qb612mWyrA2Ga2WhXRgYE7tqo8rGs6f6UBZciqcJvfYUGTp';
      const chain = SubstrateChain.KILT;
      const chainType = ChainType.SUBSTRATE;

      await new Transaction(
        {
          address,
          chain,
          chainType,
          transactionStatus: TransactionStatus.PENDING,
          nonce: 1,
          rawTransaction: 'SOME_RAW_DATA',
          transactionHash:
            '0x743a3e8e255c5623da1b3e84ee28a671ada6ac92fd347215f2904b142d32a1fd',
        },
        stage.context,
      ).insert();

      await new Transaction(
        {
          address,
          chain,
          chainType,
          transactionStatus: TransactionStatus.PENDING,
          nonce: 2,
          rawTransaction: 'SOME_RAW_DATA_2',
          transactionHash:
            '0x2cef26ef0ab429985cd9a6f7f7e4443bf16bbab387b696d940f1ecca87e62e88',
        },
        stage.context,
      ).insert();

      await new Transaction(
        {
          address,
          chain,
          chainType,
          transactionStatus: TransactionStatus.PENDING,
          nonce: 3,
          rawTransaction: 'SOME_RAW_DATA_3',
          transactionHash:
            '0x676202a86bf27eeefdc10c7a1546800dd75912769f23247baae8abd5366cb93b',
        },
        stage.context,
      ).insert();

      const parameters = {
        chainId: SubstrateChain.KILT,
      };

      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };

      const workerDefinition = new WorkerDefinition(
        serviceDef,
        WorkerName.VERIFY_KILT_TRANSACTIONS,
        {
          parameters: { FunctionName: 'test', ...parameters },
        },
      );

      await new SubstrateTransactionWorker(
        workerDefinition,
        stage.context,
      ).runExecutor();

      const txs: Transaction[] = await new Transaction(
        {},
        stage.context,
      ).getList(chain, chainType, address, 0);

      expect(txs.length).toBe(3);
      expect(
        txs.find((x) => x.transactionStatus != TransactionStatus.CONFIRMED),
      ).toBeFalsy();

      expect(txs.find((x) => !x['webhookTriggered'])).toBeFalsy();
    });

    test('Single wallet_2 failed transaction not accounted', async () => {
      const chain = SubstrateChain.KILT;
      const chainType = ChainType.SUBSTRATE;
      const address = '4sAqndzGzNYtrdAWhSSnaGptrGY1TSJ99kf5ZRwAzcPUbaTN';

      wallet.lastParsedBlock = 4476985;
      await wallet.update();

      // Failed 1
      await new Transaction(
        {
          address,
          chain,
          chainType,
          transactionStatus: TransactionStatus.PENDING,
          nonce: 1,
          rawTransaction: 'FAILED_TRANSACTION',
          transactionHash:
            '0x23a0b353374c195563a9708b2953a7c3467e80fc9f29f69358b8e1b7c8441478',
        },
        stage.context,
      ).insert();

      // Failed 2
      await new Transaction(
        {
          address,
          chain,
          chainType,
          transactionStatus: TransactionStatus.PENDING,
          nonce: 1,
          rawTransaction: 'FAILED_TRANSACTION',
          transactionHash:
            '0x882cf85d776dbc4a78edd189b976b4a67ae15f2a871e56f20d41242aa20d29d6',
        },
        stage.context,
      ).insert();

      // Failed 3
      await new Transaction(
        {
          address,
          chain,
          chainType,
          transactionStatus: TransactionStatus.PENDING,
          nonce: 1,
          rawTransaction: 'FAILED_TRANSACTION',
          transactionHash:
            '0x17ae03bc64d1b9c332b1874c864eae60dcdea040ecede965b4ccf8e9f3331432',
        },
        stage.context,
      ).insert();

      const parameters = {
        chainId: SubstrateChain.KILT,
      };

      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };

      const workerDefinition = new WorkerDefinition(
        serviceDef,
        WorkerName.VERIFY_KILT_TRANSACTIONS,
        {
          parameters: { FunctionName: 'test', ...parameters },
        },
      );

      await new SubstrateTransactionWorker(
        workerDefinition,
        stage.context,
      ).runExecutor();

      console.log('Getting transactions: ');

      const txs: Transaction[] = await new Transaction(
        {},
        stage.context,
      ).getList(chain, chainType, address, 0);

      console.log('Transactions: ', txs);

      expect(
        txs.find((x) => x.transactionStatus == TransactionStatus.FAILED),
      ).toBeTruthy();
      expect(txs.length).toEqual(3);
    });
  });

  describe('Crust tests', () => {
    let api: ApiPromise,
      lastProcessedNonceOnChain: number,
      wallet: Wallet,
      pair: KeyringPair;
    let config: any;
    const startBlock = 9607270;
    const chain = SubstrateChain.CRUST;
    const httpMocker = HttpRequestMock.setup();

    beforeAll(async () => {
      env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://localhost:4351/graphql';
      config = await getConfig();
      const endpoint = await new Endpoint(
        {
          ...config.crust.endpoint,
          chain: config.crust.chain,
          chainType: config.crust.chainType,
        },
        stage.context,
      ).insert();
      const provider = new WsProvider(endpoint.url);
      api = await ApiPromise.create({
        provider,
        typesBundle: typesBundleForPolkadot,
        throwOnConnect: true,
      });

      const lastNonceOnChain = (
        await api.rpc.system.accountNextIndex(config.crust.wallet.address)
      ).toNumber();
      lastProcessedNonceOnChain = lastNonceOnChain - 1;
      wallet = await new Wallet(
        {
          ...config.crust.wallet,
          chain: config.crust.chain,
          chainType: config.crust.chainType,

          nextNonce: lastProcessedNonceOnChain,
          lastProcessedNonce: lastProcessedNonceOnChain - 1,
          lastParsedBlock: startBlock,
        },
        stage.context,
      ).insert();
      const keyring = new Keyring({ type: 'sr25519' });
      pair = keyring.addFromUri(wallet.seed);
    });

    afterAll(async () => {
      httpMocker.reset();
    });

    test('self repair nonce for transactions with final status in DB', async () => {
      //TRANSACTION
      const tx = api.tx.market.placeStorageOrder(
        'QmUQ6i2Njyktbtvb5vxnzynD9fTrAvYN1qYbSKjudCv8mB',
        7390,
        0,
        '',
      );
      const unsignedTx = api.tx(tx.toHex());
      const signed = await unsignedTx.signAsync(pair, {
        nonce: wallet.nextNonce - 1,
        era: 0,
      });
      const transaction = await new Transaction(
        {
          address: wallet.address,
          chain,
          chainType: CHAIN_TYPE,
          nonce: lastProcessedNonceOnChain,
          rawTransaction: signed.toHex(),
          transactionHash: signed.hash.toString(),
          transactionStatus: TransactionStatus.CONFIRMED,
        },
        stage.context,
      ).insert();

      await SubstrateService.transmitTransactions(
        { chain },
        stage.context,
        async () => {
          return;
        },
      );

      const updatedCrustWallet = await new Wallet(
        {},
        stage.context,
      ).populateById(wallet.id);
      expect(updatedCrustWallet.lastProcessedNonce).toEqual(transaction.nonce);
      await transaction.delete();
      await wallet
        .populate({ lastProcessedNonce: lastProcessedNonceOnChain - 1 })
        .update();
    });

    test('self repair nonce with indexer not having transaction details', async () => {
      //TRANSACTION
      const tx = api.tx.market.placeStorageOrder(
        'QmUQ6i2Njyktbtvb5vxnzynD9fTrAvYN1qYbSKjudCv8mB',
        7390,
        0,
        '',
      );
      const unsignedTx = api.tx(tx.toHex());
      const signed = await unsignedTx.signAsync(pair, {
        nonce: wallet.nextNonce - 1,
        era: 0,
      });
      const transaction = await new Transaction(
        {
          address: wallet.address,
          chain,
          chainType: CHAIN_TYPE,
          nonce: lastProcessedNonceOnChain,
          rawTransaction: signed.toHex(),
          transactionHash: signed.hash.toString(),
          transactionStatus: TransactionStatus.PENDING,
        },
        stage.context,
      ).insert();
      httpMocker.post(
        env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER,
        {
          data: {},
        },
        { header: { 'content-type': 'application/json' } },
      );

      await SubstrateService.transmitTransactions(
        { chain },
        stage.context,
        async () => {
          return;
        },
      );

      const updatedCrustWallet = await new Wallet(
        {},
        stage.context,
      ).populateById(wallet.id);
      expect(updatedCrustWallet.lastProcessedNonce).toEqual(
        wallet.lastProcessedNonce,
      );
      await transaction.delete();
    });

    test('self repair nonce with indexer having transaction details', async () => {
      //TRANSACTION
      const tx = api.tx.market.addPrepaid(
        'QmUQ6i2Njyktbtvb5vxnzynD9fTrAvYN1qYbSKjudCv8mB',
        100,
      );
      const unsignedTx = api.tx(tx.toHex());
      const signed = await unsignedTx.signAsync(pair, {
        nonce: wallet.nextNonce - 1,
        era: 0,
      });
      await new Transaction(
        {
          address: wallet.address,
          chain,
          chainType: CHAIN_TYPE,
          nonce: lastProcessedNonceOnChain,
          rawTransaction: signed.toHex(),
          transactionHash: signed.hash.toString(),
          transactionStatus: TransactionStatus.PENDING,
        },
        stage.context,
      ).insert();
      httpMocker.post(
        env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER,
        {
          data: {
            storageOrders: [
              {
                account: { id: wallet.address },
                extrinsicHash: 'some_hash',
              },
            ],
            transfers: [
              {
                extrinsicHash: 'some_hash',
                from: { id: wallet.address },
              },
            ],
          },
        },
        { header: { 'content-type': 'application/json' } },
      );

      await SubstrateService.transmitTransactions(
        { chain },
        stage.context,
        async () => {
          return;
        },
      );

      const updatedCrustWallet = await new Wallet(
        {},
        stage.context,
      ).populateById(wallet.id);
      expect(updatedCrustWallet.lastProcessedNonce).toEqual(
        lastProcessedNonceOnChain,
      );
    });

    test('Single successful wallet transaction', async () => {
      const chain = SubstrateChain.CRUST;
      const chainType = ChainType.SUBSTRATE;

      await new Transaction(
        {
          address: config.crust.wallet.address,
          chain,
          chainType,
          transactionStatus: TransactionStatus.PENDING,
          nonce: 1,
          rawTransaction: 'SOME_RAW_DATA',
          transactionHash:
            '0xb8c9e8b8ec63726ff73af9669414bb7b2e887699aaff7cf248ba1dc89aed3899',
        },
        stage.context,
      ).insert();

      const parameters = {
        chainId: SubstrateChain.CRUST,
      };

      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };

      const workerDefinition = new WorkerDefinition(
        serviceDef,
        WorkerName.VERIFY_CRUST_TRANSACTIONS,
        {
          parameters: { FunctionName: 'test', ...parameters },
        },
      );

      await new SubstrateTransactionWorker(
        workerDefinition,
        stage.context,
      ).runExecutor();

      const txs: Transaction[] = await new Transaction(
        {},
        stage.context,
      ).getList(chain, chainType, config.crust.wallet.address, 0);

      expect(txs.length).toBe(1);

      expect(
        txs.find((x) => x.transactionStatus == TransactionStatus.CONFIRMED),
      ).toBeTruthy();
    });
  });
});
