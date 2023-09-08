import { env } from '@apillon/lib';
import { CrustBlockchainIndexer } from './crust-indexer.service';

// TODO: Move to indexer, test with real wallet
// TODO2: Add more test cases
describe('Test all transactions', () => {
  const address = 'cTGtJ8Ue4h1o7bC4i75uWLAF1sbJmuqmN6KAqB9hqssp1kCED';

  beforeAll(async () => {
    env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://localhost:4351/graphql';
  });

  test('Get all transactions', async () => {
    const crustIndexer = new CrustBlockchainIndexer();

    // Withdrawals from block to block
    const allTransactions: any = await crustIndexer.getAllTransactions(
      address,
      11280536,
      11280936,
    );

    // TODO: Does not check if any other element is present in the transaction
    expect(allTransactions.storageOrders.length).toEqual(1);
    expect(allTransactions.transfers.length).toEqual(3);
    expect(allTransactions.systems.length).toEqual(2);
  });

  test('Get all system events', async () => {
    const crustIndexer = new CrustBlockchainIndexer();

    // Withdrawals from block to block
    const systemTransactions: any = await crustIndexer.getAllSystemEvents(
      address,
      11281560,
      11281620,
    );

    console.log('All transactions ', systemTransactions);

    // TODO: Does not check if any other element is present in the transaction
    expect(systemTransactions.length).toEqual(8);
  });
});
