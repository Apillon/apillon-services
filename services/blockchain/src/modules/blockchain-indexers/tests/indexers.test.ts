import { env, SubstrateChain, ChainType } from '@apillon/lib';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { Wallet } from '../../wallet/wallet.model';
import { setupTest, releaseStage, Stage } from '../../../../test/setup';
import { KiltBlockchainIndexer } from '../../blockchain-indexers/substrate/kilt/kilt-indexer.service';
import { kiltIndexerTransactions } from './test-data/indexer-transactions';

describe('Indexer tests', () => {
  let stage: Stage;
  let wallet: Wallet;
  let address: string;
  let chain: number;
  let chainType: number;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_KILT_GRAPHQL_SERVER = 'http://3.251.2.33:8082/graphql';
    address = '4sAqndzGzNYtrdAWhSSnaGptrGY1TSJ99kf5ZRwAzcPUbaTN';
    chain = SubstrateChain.KILT;
    chainType = ChainType.SUBSTRATE;

    wallet = await new Wallet(
      {
        chain,
        chainType,
        address,
        // This is actually not correct - the seed should match the address
        seed: mnemonicGenerate(),
        lastParsedBlock: 3982289,
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('KILT | Indexer should get all transactions', async () => {
    const indexer = new KiltBlockchainIndexer();

    const controlTransactions = kiltIndexerTransactions;
    // Get all transactions from the
    const transactions = await indexer.getAllTransactions(
      address,
      3882290,
      4278006,
    );

    // NOTE: These are very basic tests, that don't care about the structure
    // and correct data of the transaction received.
    // TODO: EXTENDS with ACTUAL tests, that verify integrity.
    expect(controlTransactions.transfers.length).toEqual(
      transactions.transfers.length,
    );
    expect(controlTransactions.systems.length).toEqual(
      transactions.systems.length,
    );
    expect(controlTransactions.dids.length).toEqual(transactions.dids.length);
    expect(controlTransactions.attestations.length).toEqual(
      transactions.attestations.length,
    );
  });
});
