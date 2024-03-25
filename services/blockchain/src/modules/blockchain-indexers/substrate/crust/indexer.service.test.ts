import { env } from '@apillon/lib';
import { CrustBlockchainIndexer } from './indexer.service';

// TODO: Move to indexer, test with real wallet
// TODO2: Add more test cases
// TODO3: Once new indexer deployed to crust, modify this test.
describe('Test all transactions', () => {
  const address = 'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU';

  beforeAll(async () => {
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://3.251.2.33:8081/graphql';
  });

  test('Get all transactions', async () => {
    const crustIndexer = new CrustBlockchainIndexer();

    // Withdrawals from block to block
    const allTransactions: any = await crustIndexer.getAllTransactions(
      address,
      14047266,
      14047291,
    );

    // TODO: Does not check if any other element is present in the transaction
    expect(allTransactions.storageOrders.length).toEqual(76);
    expect(allTransactions.transfers.length).toEqual(228);
    expect(allTransactions.systems.length).toEqual(76);
  });

  test('Get all system events', async () => {
    const crustIndexer = new CrustBlockchainIndexer();

    // Withdrawals from block to block
    const systemTransactions: any = await crustIndexer.getAllSystemEvents(
      address,
      14047266,
      14047291,
    );

    console.log('All transactions ', systemTransactions);

    // TODO: Does not check if any other element is present in the transaction
    expect(systemTransactions.length).toEqual(71);
  });
});
