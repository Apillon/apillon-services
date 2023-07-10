import { env } from '@apillon/lib';
import { CrustBlockchainIndexer } from './crust-indexer.service';
import { CrustStorageOrders } from './data-models/crust-storage-orders';
import { CrustTransfers } from './data-models/crust-transfers';

describe.skip('Crust blockchain indexer - Wallet transfers', () => {
  beforeAll(async () => {
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://18.203.251.180:8081/graphql';
  });

  test('Crust withdrawals exists.', async () => {
    const crustIndexer = new CrustBlockchainIndexer();

    // Withdrawals from block to block
    const txs: CrustTransfers = await crustIndexer.getWalletWithdrawals(
      'cTL9KUAybw2tneR6VgUbDzXwuYzVuWCbFwK1Esnq2s1mzEVza',
      6465276,
      6465276 + 50,
    );
    console.log(`Obtained ${txs.transfers.length} Crust deposits `);
    expect(txs.transfers.length > 0).toBe(true);
  });

  test('Crust deposits exits.', async () => {
    const crustIndexer = new CrustBlockchainIndexer();
    const txs: CrustTransfers = await crustIndexer.getWalletDeposits(
      'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU',
      6465276,
      6465278,
    );
    expect(txs.transfers.length == 1).toBe(true);
  });
});

describe.skip('Crust blockchain indexer - File storage orders', () => {
  beforeAll(async () => {
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://18.203.251.180:8081/graphql';
  });

  test('Crust file orders exists between blocks.', async () => {
    const crustIndexer = new CrustBlockchainIndexer();

    // Withdrawals from block to block
    const txOrders: CrustStorageOrders = await crustIndexer.getMarketFileOrders(
      'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU',
      8686554,
      8686557,
    );
    console.log(`Obtained ${txOrders.storageOrders.length} Crust file orders `);
    expect(txOrders.storageOrders.length == 2).toBe(true);
  });

  test('Crust file orders highest block is last.', async () => {
    const crustIndexer = new CrustBlockchainIndexer();

    // Withdrawals from block to block
    const txOrders: CrustStorageOrders = await crustIndexer.getMarketFileOrders(
      'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU',
      8686554,
      8686557,
    );
    console.log(`Obtained ${txOrders.storageOrders.length} Crust file orders `);
    expect(txOrders.storageOrders.length == 2).toBe(true);
    expect(
      txOrders.storageOrders[0].blockNum < txOrders.storageOrders[1].blockNum,
    ).toBe(true);
  });
});

describe.skip('Crust blockchain indexer err', () => {
  beforeAll(async () => {
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = null;
  });
  it('Expect throwing error.', function () {
    expect(() => new CrustBlockchainIndexer()).toThrow(
      new Error('Missing GraphQL server url!'),
    );
  });
});

describe.skip('Crust blockchain indexer - block height', () => {
  beforeAll(async () => {
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://18.203.251.180:8081/graphql';
  });
  test('Block nr higher than 6000', async () => {
    const crustIndexer = new CrustBlockchainIndexer();

    const blockHeight: number = await crustIndexer.getBlockHeight();
    expect(blockHeight > 6000).toBe(true);
  });
});

describe.skip('Hashes test', () => {
  test('Iterableiterator to string comma delimited.', () => {
    const test = new Map<string, number>();
    test.set(
      '0xe78f37a480e5907afb7a862ec5bb2a88c24c027184d0f7352d305c35e4a4a9f5',
      1,
    );
    test.set(
      '0x3d1e729d040a716bada69f9e926bd508cc6308e4c984c840389f7566f3b482b4',
      2,
    );
    const hashes = [...test.keys()].join(',');
    console.log(hashes);
    expect(hashes).toBe(
      '0xe78f37a480e5907afb7a862ec5bb2a88c24c027184d0f7352d305c35e4a4a9f5,' +
        '0x3d1e729d040a716bada69f9e926bd508cc6308e4c984c840389f7566f3b482b4',
    );
  });
});
