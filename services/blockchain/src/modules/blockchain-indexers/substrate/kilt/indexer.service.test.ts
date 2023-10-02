import { env } from '@apillon/lib';
import { KiltBlockchainIndexer } from './indexer.service';

// TODO: Move to indexer, test with real wallet
// TODO2: Add more test cases
// TODO3: Once new indexer deployed to crust, modify this test.
describe('Testing indexer data-fetch', () => {
  beforeAll(async () => {
    env.BLOCKCHAIN_KILT_GRAPHQL_SERVER = 'http://3.251.2.33:8082/graphql';
  });

  test('Get all transactions', async () => {
    const kiltIndexer = new KiltBlockchainIndexer();
    const fromBlock = 4377705;
    const toBlock = 4410572;
    const address = '4qb612mWyrA2Ga2WhXRgYE7tqo8rGs6f6UBZciqcJvfYUGTp';

    // Get all systems without limit
    const systems: any = await kiltIndexer.getAllSystemEvents(
      address,
      fromBlock,
      toBlock,
    );

    expect(systems.length).toEqual(8);

    // Get all systems without limit
    const systemsWithLimit: any = await kiltIndexer.getAllSystemEvents(
      address,
      fromBlock,
      toBlock,
      5,
    );
    expect(systemsWithLimit.length).toEqual(5);

    // Get all transfer events
    const transfers: any = await kiltIndexer.getAccountBalanceTransfers(
      address,
      fromBlock,
      toBlock,
    );
    expect(transfers.length).toEqual(9);

    // Get all did events
    const didCreatedEvents: any = await kiltIndexer.getAccountDidCreate(
      address,
      fromBlock,
      toBlock,
    );
    expect(didCreatedEvents.length).toEqual(4);

    // Get all attestation events
    const attestationCreateEvents: any =
      await kiltIndexer.getAccountAttestCreate(address, fromBlock, toBlock);
    expect(attestationCreateEvents.length).toEqual(4);
  });

  test('Required parameters present', async () => {
    const kiltIndexer = new KiltBlockchainIndexer();
    const fromBlock = 4377705;
    const toBlock = 4410572;
    const address = '4qb612mWyrA2Ga2WhXRgYE7tqo8rGs6f6UBZciqcJvfYUGTp';

    // Get all systems without limit
    const systemEvents: any = await kiltIndexer.getAllSystemEvents(
      address,
      fromBlock,
      toBlock,
    );

    console.log('Params: ', address, fromBlock, toBlock);
    expect(systemEvents.length).toEqual(8);

    const requiredProperties = [
      'id',
      'blockHash',
      'blockNumber',
      'extrinsicId',
      'extrinsicHash',
      'transactionType',
      'createdAt',
      'status',
      'account',
      'error',
      'fee',
    ];

    for (const event of systemEvents) {
      const invalidValue = requiredProperties.reduce(
        (isValid, currentValue) =>
          (isValid = event.hasOwnProperty(currentValue)),
        false,
      );
      expect(invalidValue).toEqual(true);
    }
  });
});